/* eslint-disable @typescript-eslint/ban-ts-comment */
import { AuthenticatorAdapter } from './Authenticator';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

const jwtMock = jest.mocked(jwt);

describe('Authenticator', () => {
  let instance: AuthenticatorAdapter;

  beforeEach(() => {
    instance = new AuthenticatorAdapter('secretKey', jwtMock);
  });

  it('should throw on invalid token', async () => {
    jwtMock.verify.mockImplementationOnce(() => {
      throw new Error('invalid token');
    });
    await expect(instance.authorize('invalidToken')).rejects.toThrow('invalid token');
  });

  it('should return decoded payload on valid token', async () => {
    const decodedPayload = { userId: 123 };
    //@ts-ignore
    jwtMock.verify.mockReturnValueOnce({ userId: '123' });
    const result = await instance.authorize('validToken');
    expect(result).toEqual(decodedPayload);
  });
});
