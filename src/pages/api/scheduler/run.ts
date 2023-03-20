import type { NextApiRequest, NextApiResponse } from 'next';
import { WebClient } from '@slack/web-api';
import { timingSafeEqual } from 'node:crypto';
import createHttpError from 'http-errors';
import { getParticipantAirtableLink, slackAlert } from 'src/lib/api/slackAlert';
import { scan } from '../../../lib/api/db';
import {
  Installation, installationsTable, Meeting, meetingsTable, participantsTableFor,
} from '../../../lib/api/tables';
import env from '../../../lib/api/env';
import { findSlackId } from '../../../lib/api/slack';
import { matcher } from './_matcher';
import { followUpper } from './_followUpper';
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

  const installations = await scan(installationsTable);
  const meetings = await scan(meetingsTable);

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

const handleInstallation = async (installation: Installation, meetings: Meeting[]) => {
  // Setup Slack client for this installation
  const slack = new WebClient(
    JSON.parse(installation.slackInstallationJson).bot.token,
    { teamId: installation.slackTeamId },
  );

  // Get all the people to match
  const { members } = await slack.users.list();
  if (members === undefined) {
    throw new Error(`Failed to get Slack members for installation ${installation.id}`);
  }
  const participants = (await scan(
    participantsTableFor(installation),
    installation.participantsViewId ? { view: installation.participantsViewId } : undefined,
  ))
    // We filter in JS, rather than pushing the filters to Airtable, because:
    // - This is faster: Airtable is really slow at applying filters.
    // - This is less complex: Otherwise we'd need to handle custom mappings.
    .filter((p) => {
      if (p.slackEmail === undefined) {
        slackAlert(`Warning: Installation ${installation.name} skipped participant ${p.id} because they don't have a Slack email. ${getParticipantAirtableLink(installation, p.id)}.`);
        return false;
      }
      return true;
    })
    .flatMap((p) => {
      try {
        return {
          ...p,
          slackId: findSlackId(p, members),
        };
      } catch (err) {
        slackAlert(`Warning: Installation ${installation.name} skipped participant ${p.id} because we couldn't match their Slack email to a Slack user. ${getParticipantAirtableLink(installation, p.id)}.`);
        return [];
      }
    });

  await matcher(slack, installation, participants, meetings);
  await followUpper(slack, installation, participants, meetings);
};
