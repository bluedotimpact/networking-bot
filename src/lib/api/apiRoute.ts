import createHttpError from 'http-errors';
import { NextApiHandler } from 'next';
import { slackAlert } from './slackAlert';
import { assertTokenValid } from './tokens';

export const apiRoute = (handler: NextApiHandler, useAuth: true | 'insecure_no_auth' = true): NextApiHandler => async (req, res) => {
  try {
    if (useAuth !== 'insecure_no_auth') {
      const token = req.headers.authorization?.slice('Bearer '.length).trim();
      if (!token) {
        throw new createHttpError.Unauthorized('Missing token');
      }
      assertTokenValid(token);
    }
    await handler(req, res);
  } catch (err: unknown) {
    if (createHttpError.isHttpError(err) && err.expose) {
      console.warn('Error handling request:');
      console.warn(err);
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error('Internal error handling request:');
    console.error(err);
    await slackAlert(`Error: Failed request: ${err instanceof Error ? err.message : String(err)}`);
    res.status(createHttpError.isHttpError(err) ? err.statusCode : 500).json({
      error: 'Internal Server Error',
    });
  }
};
