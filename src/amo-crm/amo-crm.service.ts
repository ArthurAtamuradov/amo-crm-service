import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { TokenStorageService } from './token-storage.service';

@Injectable()
export class AmoCrmService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly apiUrl: string;
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
    this.apiUrl = this.configService.get('AMO_API_URL');

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
    const url = `${this.apiUrl}/oauth2/access_token`;

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

  async VerifyIfAccessTokenValid() {
    if (!this.isAccessTokenValid) {
      this.refreshTokens();
    }
  }

  async refreshTokens(): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const url = `${this.apiUrl}/oauth2/access_token`;
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

      this.setTokens(tokens);

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

  async findOrCreateContact(
    name: string,
    email: string,
    phone: string,
  ): Promise<void> {
    try {
      let contactId = await this.findContactByEmailOrPhone(email, phone);

      if (contactId) {
        await this.updateContact(contactId, { name, phone, email });
      } else {
        contactId = await this.createContact(name, phone, email);

        if (contactId) {
          await this.createDeal(contactId);
        }
      }
    } catch (error) {
      throw new HttpException(
        'Failed to process AmoCRM request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async findContactByEmailOrPhone(
    email: string,
    phone: string,
  ): Promise<number | null> {
    const url = `${this.apiUrl}/api/v4/contacts`;
    await this.VerifyIfAccessTokenValid();

    try {
      const { data } = await firstValueFrom(
        this.httpService
          .get(url, {
            headers: {
              Accept: 'application/hal+json',
              Authorization: `Bearer ${this.accessToken}`,
            },
            params: {
              query: `(${email}) OR (${phone})`,
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              console.log('Axios error:', error);
              throw AxiosError;
            }),
          ),
      );

      console.log(data);

      const contacts = data ? data._embedded.contacts : null;

      if (contacts && contacts.length > 0) {
        // Assuming that the first contact in the list is the desired one
        const foundContact = contacts[0];
        console.log('Found contact:', foundContact);
        return foundContact;
      } else {
        console.log('Contact not found');
        return null;
      }
    } catch (error) {
      console.error(
        'Error finding contact:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to find contact');
    }
  }

  private async updateContact(
    contactId: number,
    updatedData: { name: string; phone: string; email: string },
  ): Promise<void> {
    const url = `${this.apiUrl}/api/v4/contacts/${contactId}`;
    const accessToken = await this.VerifyIfAccessTokenValid();

    try {
      const { data } = await firstValueFrom(
        this.httpService
          .patch(
            url,
            {
              name: updatedData.name,
              custom_fields_values: [
                {
                  field_id: 'email',
                  values: [{ value: updatedData.email }],
                },
                { field_id: 'phone', values: [{ value: updatedData.phone }] },
              ],
            },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          )
          .pipe(
            catchError((error: AxiosError) => {
              console.log('Axios error:', error);
              throw AxiosError;
            }),
          ),
      );

      const updatedContact = data;
      console.log('Updated contact:', updatedContact);
      return updatedContact;
    } catch (error) {
      console.error(
        'Error updating contact:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to update contact');
    }
  }

  private async createContact(
    name: string,
    phone: string,
    email: string,
  ): Promise<number | null> {
    const url = `${this.apiUrl}/api/v4/contacts`;

    await this.VerifyIfAccessTokenValid();

    try {
      const { data } = await firstValueFrom(
        this.httpService
          .post(
            url,
            {
              name,
              custom_fields_values: [
                {
                  field_id: 'email',
                  values: [{ value: email }],
                },
                { field_id: 'phone', values: [{ value: phone }] },
              ],
            },
            {
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
              },
            },
          )
          .pipe(
            catchError((error: AxiosError) => {
              console.log('Axios error:', error);
              throw AxiosError;
            }),
          ),
      );

      const createdContact = data;
      console.log('Created contact:', createdContact);
      return createdContact;
    } catch (error) {
      console.error(
        'Error creating contact:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to create contact');
    }
  }

  private async createDeal(contactId: number): Promise<void> {
    const url = `${this.apiUrl}/api/v4/leads`;

    await this.VerifyIfAccessTokenValid();

    try {
      const dealData = {
        contacts: [{ id: contactId }],
      };

      const { data } = await firstValueFrom(
        this.httpService
          .post(url, dealData, {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              console.log('Axios error:', error);
              throw AxiosError;
            }),
          ),
      );

      const createdDeal = data;
      console.log('Created deal:', createdDeal);
      return createdDeal;
    } catch (error) {
      console.error(
        'Error creating deal:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to create deal');
    }
  }
}
