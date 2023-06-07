import createHttpError from 'http-errors';
import type { NextApiRequest, NextApiResponse } from 'next';
import { assertTokenValid } from '../../../../lib/api/tokens';
import { apiRoute } from '../../../../lib/api/apiRoute';

export type LoginResponse = {
  accessToken: string,
  expiresAt: number,
};

export default apiRoute(async (
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>,
) => {
  const idToken: unknown = req.body?.idToken;
  if (typeof idToken !== 'string') {
    throw new createHttpError.BadRequest('Missing idToken');
  }

  const tokenPayload = await assertTokenValid(idToken);

  res.status(200).json({ accessToken: idToken, expiresAt: tokenPayload.exp });
}, 'insecure_no_auth');
