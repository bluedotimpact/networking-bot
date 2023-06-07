import type { NextApiRequest, NextApiResponse } from 'next';
import { scan } from '../../../lib/api/db/common';
import { Installation, installationsTable } from '../../../lib/api/db/tables';
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
  const installations = await scan(installationsTable);

  res.status(200).json({
    installations,
    baseId: installationsTable.baseId,
    tableId: installationsTable.tableId,
  });
});
