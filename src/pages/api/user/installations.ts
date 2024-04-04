import type { NextApiRequest, NextApiResponse } from 'next';
import db, { Installation, installationsTable } from '../../../lib/api/db';
import { apiRoute } from '../../../lib/api/apiRoute';

export type LoginResponse = {
  accessToken: string,
  expiresAt: number,
};

export default apiRoute(async (
  req: NextApiRequest,
  res: NextApiResponse<{
    installations: Installation[],
    baseId: string,
    tableId: string,
  }>,
) => {
  const installations = await db.scan(installationsTable);

  res.status(200).json({
    installations,
    baseId: installationsTable.baseId,
    tableId: installationsTable.tableId,
  });
});
