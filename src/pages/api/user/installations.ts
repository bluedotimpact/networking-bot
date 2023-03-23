import type { NextApiRequest, NextApiResponse } from 'next';
import { scan } from 'src/lib/api/db';
import { Installation, installationsTable } from 'src/lib/api/tables';
import { apiRoute } from '../../../lib/api/apiRoute';

export type LoginResponse = {
  accessToken: string,
  expiresAt: number,
};

export default apiRoute(async (
  req: NextApiRequest,
  res: NextApiResponse<Installation[]>,
) => {
  const installations = await scan(installationsTable);

  res.status(200).json(installations);
});
