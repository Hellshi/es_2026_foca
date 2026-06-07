import jwt from 'jsonwebtoken';
import { AuthorizeResponse } from './types/authenticate.type';

export class AuthenticatorAdapter {
  private readonly authenticator: typeof jwt;
  private readonly secretKey: string;

  constructor(secretKey: string, authenticator: typeof jwt) {
    this.secretKey = secretKey;
    this.authenticator = authenticator;
  }

  async authenticate(payload: any): Promise<any> {}

  async authorize(token: string): Promise<AuthorizeResponse> {
    const decoded = this.authenticator.verify(token, this.secretKey) as AuthorizeResponse;
    return {
      userId: decoded.userId,
      role: decoded.role,
      validTrough: decoded.validTrough,
    };
  }
}
