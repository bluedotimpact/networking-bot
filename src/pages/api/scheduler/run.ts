import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'node:crypto';
import createHttpError from 'http-errors';
import { handleInstallation } from '../../../lib/api/runner/core';
import db, {
  installationsTable, meetingsTable,
} from '../../../lib/api/db';
import env from '../../../lib/api/env';
import { apiRoute } from '../../../lib/api/apiRoute';

export type RunResponse = {
  status: string
};

export default apiRoute(async (
  req: NextApiRequest,
  res: NextApiResponse<RunResponse>,
) => {
  // When removing, also remove security exemption
  if (env.SCHEDULER_API_KEY !== 'UNSAFE_ONLY_USE_LOCALLY_NO_AUTH') {
    const providedKey = Array.isArray(req.headers['x-api-key'])
      ? req.headers['x-api-key'].join('')
      : req.headers['x-api-key'];
    if (!providedKey || !timingSafeEqual(
      Buffer.from(env.SCHEDULER_API_KEY),
      Buffer.from(providedKey ?? ''),
    )) {
      throw createHttpError.Unauthorized('Missing or incorrect API key');
    }
  }

  const installations = await db.scan(installationsTable);
  const meetings = await db.scan(meetingsTable);

  await Promise.all(installations.map(async (installation) => {
    try {
      await handleInstallation(installation, meetings.filter((m) => m.installationId === installation.id));
    } catch (err) {
      console.error(`Error handling installation: ${installation.id}`);
      console.error(err);
    }
  }));

  res.status(200).json({ status: 'Complete' });
}, 'insecure_no_auth');
