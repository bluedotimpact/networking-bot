import type { NextApiRequest, NextApiResponse } from 'next';
import createHttpError from 'http-errors';
import { handleInstallation } from '../../../lib/api/runner/core';
import db, {
  installationsTable, meetingsTable,
} from '../../../lib/api/db';
import { apiRoute } from '../../../lib/api/apiRoute';

export type RunRequest = {
  installationId: string
};

export type RunResponse = {
  status: string
};

export default apiRoute(async (
  req: NextApiRequest,
  res: NextApiResponse<RunResponse>,
) => {
  if (!('installationId' in req.body) || typeof req.body.installationId !== 'string') {
    throw new createHttpError.BadRequest('Missing installation id');
  }

  const installation = await db.get(installationsTable, req.body.installationId);
  const meetings = (await db.scan(meetingsTable)).filter((m) => m.installationId === installation.id);

  await handleInstallation(installation, meetings);

  res.status(200).json({ status: 'Complete' });
});
