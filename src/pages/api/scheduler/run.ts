import { scan } from '@/lib/db'
import { Installation, installationsTable, Meeting, meetingsTable, participantsTableFor } from '@/lib/tables'
import type { NextApiRequest, NextApiResponse } from 'next'
import { WebClient } from '@slack/web-api'
import { timingSafeEqual } from 'node:crypto'
import env from '@/lib/env'
import createHttpError from 'http-errors'
import { findSlackId } from '@/lib/slack'
import { matcher } from './_matcher'
import { followUpper } from './_followUpper'
import { apiRoute } from '@/lib/apiRoute'

export type RunResponse = {
  status: string
}

export default apiRoute(async (
  req: NextApiRequest,
  res: NextApiResponse<RunResponse>
) => {
  if (env.SCHEDULER_API_KEY !== "UNSAFE_ONLY_USE_LOCALLY_NO_AUTH") {
    const providedKey = Array.isArray(req.headers['x-api-key'])
      ? req.headers['x-api-key'].join('')
      : req.headers['x-api-key'];
    if (!providedKey || !timingSafeEqual(
      Buffer.from(env.SCHEDULER_API_KEY),
      Buffer.from(providedKey ?? '')
    )) {
      throw createHttpError.Unauthorized('Missing or incorrect API key');
    }
  }

  const installations = await scan(installationsTable)
  const meetings = await scan(meetingsTable)

  await Promise.all(installations.map(async (installation) => {
    try {
      await handleInstallation(installation, meetings.filter(m => m.installationId === installation.id))
    } catch (err) {
      console.error(`Error handling installation: ${installation.id}`)
      console.error(err)
    }
  }));

  res.status(200).json({ 'status': 'Complete' })
})

const handleInstallation = async (installation: Installation, meetings: Meeting[]) => {
  // Setup Slack client for this installation
  const slack = new WebClient(
    JSON.parse(installation.slackInstallationJson).bot.token,
    { teamId: installation.slackTeamId },
  );

  // Get all the people to match
  const members = (await slack.users.list()).members
  if (members === undefined) {
    throw new Error(`Failed to get Slack members for installation ${installation.id}`)
  }
  const participants = (await scan(
    participantsTableFor(installation),
    installation.participantsViewId ? { view: installation.participantsViewId } : undefined
  ))
    // We filter in JS, rather than pushing the filters to Airtable, because:
    // - This is faster: Airtable is really slow at applying filters.
    // - This is less complex: Otherwise we'd need to handle custom mappings.
    .filter(p => {
      if (p.slackEmail === undefined) {
        console.warn(`Skipping participant ${p.id} because we don't have a Slack email for them`)
        return false;
      }
      return true;
    })
    .flatMap(p => {
      try {
        return {
          ...p,
          slackId: findSlackId(p, members),
        }
      } catch (err) {
        console.warn(`Skipping participant ${p.id} because we couldn't match their slack email to a user id`)
        return [];
      }
    });

  await matcher(slack, installation, participants, meetings);
  await followUpper(slack, installation, participants, meetings)
}

