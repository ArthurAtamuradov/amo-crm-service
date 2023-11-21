import * as fs from 'fs';

export class TokenStorageService {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  readTokens(): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } | null {
    try {
      const fileContents = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(fileContents);
    } catch (error) {
      return null;
    }
  }

  writeTokens(tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }): void {
    const dataToWrite = JSON.stringify(tokens, null, 2);
    fs.writeFileSync(this.filePath, dataToWrite, 'utf8');
  }
}
