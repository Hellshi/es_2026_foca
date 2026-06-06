import jwt from 'jsonwebtoken';

export class AuthenticatorAdapter {
  private readonly authenticator: typeof jwt;
  private readonly secretKey: string;

  constructor(secretKey: string, authenticator: typeof jwt) {
    this.secretKey = secretKey;
    this.authenticator = authenticator;
  }

  async authenticate(payload: any): Promise<any> {}

  async authorize(token: string): Promise<{ userId: number }> {
    return this.authenticator.verify(token, this.secretKey) as { userId: number };
  }
}
