import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { TokenStorageService } from './token-storage.service';

@Injectable()
export class AmoCrmService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly tokenStorage: TokenStorageService;
  private accessToken: string;
  private refreshToken: string;
  private expiresIn: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.clientId = this.configService.get('AMO_CLIENT_ID');
    this.clientSecret = this.configService.get('AMO_SERCET_KEY');
    this.redirectUri = this.configService.get('AMO_REDIRECT_URI');

    this.tokenStorage = new TokenStorageService('tokenStorage.json');

    const storedTokens = this.tokenStorage.readTokens();
    this.setTokens(storedTokens);

    if (storedTokens) {
      const isAccessTokenValid = this.isAccessTokenValid();

      if (isAccessTokenValid) {
        this.setTokens(storedTokens);
      } else {
        this.refreshTokens();
      }
    }
  }

  setTokens(tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }) {
    this.refreshToken = tokens.refreshToken;
    this.accessToken = tokens.accessToken;
    this.expiresIn = tokens.expiresIn;
  }

  async exchangeCodeForToken(
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const url = 'https://atamuradowarthur.amocrm.ru/oauth2/access_token';

    const requestData = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
    };

    const { data } = await firstValueFrom(
      this.httpService.post(url, requestData).pipe(
        catchError((error: AxiosError) => {
          console.log('Axios error:', error);
          throw AxiosError;
        }),
      ),
    );

    const tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in + Math.floor(Date.now() / 1000),
    };

    this.setTokens(tokens);

    this.tokenStorage.writeTokens(tokens);

    return tokens;
  }

  private isAccessTokenValid(): boolean {
    const now = Math.floor(Date.now() / 1000);
    return this.expiresIn > now;
  }

  async refreshTokens(): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const url = 'https://atamuradowarthur.amocrm.ru/oauth2/access_token';
    const requestData = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, requestData).pipe(
          catchError((error: AxiosError) => {
            console.log('Axios error:', error);
            throw AxiosError;
          }),
        ),
      );
      const tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in + Math.floor(Date.now() / 1000),
      };

      this.tokenStorage.writeTokens(tokens);
      return tokens;
    } catch (error) {
      console.error(
        'Error refreshing token:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to refresh token');
    }
  }
}
