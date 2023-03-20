import { OAuth2Client } from 'google-auth-library';
import createHttpError from 'http-errors';
import env from './env';

export const assertTokenValid = async (googleIdToken: string) => {
  const client = new OAuth2Client();
  const tokenPayload = (await client.verifyIdToken({
    idToken: googleIdToken,
    audience: env.NEXT_PUBLIC_GOOGLE_LOGIN_CLIENT_ID,
  }).catch(() => {
    throw new createHttpError.Unauthorized('idToken: not valid');
  })).getPayload();

  if (!tokenPayload) throw new createHttpError.Unauthorized('idToken: missing payload');
  if (!tokenPayload.email) throw new createHttpError.Unauthorized('idToken: missing email');
  if (!tokenPayload.email_verified) throw new createHttpError.Unauthorized('idToken: email not verified');
  if (tokenPayload.hd !== 'bluedotimpact.org') throw new createHttpError.Unauthorized('idToken: hd not bluedotimpact.org');

  return tokenPayload;
};
