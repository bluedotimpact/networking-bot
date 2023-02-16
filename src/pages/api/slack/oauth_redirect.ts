import { apiRoute } from '../../../lib/apiRoute';
import type { NextApiRequest, NextApiResponse } from 'next'
import { appRunner } from './_runner';

export default apiRoute(async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" })
    return;
  }
  await appRunner.handleCallback(req, res);
})
