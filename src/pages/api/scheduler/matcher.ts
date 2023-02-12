import { insert, scan } from '@/lib/db'
import { Installation, installationsTable, meetingsTable, Participant, participantsTableFor, Table } from '@/lib/tables'
import type { NextApiRequest, NextApiResponse } from 'next'
import { WebClient } from '@slack/web-api'
import { timingSafeEqual } from 'node:crypto'
import env from '@/lib/env'
import createHttpError from 'http-errors'
import { ACTION_IDS, findSlackId, makeMessage } from '@/lib/slack'

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // const providedKey = Array.isArray(req.headers['api-key'])
  //   ? req.headers['api-key'].join('')
  //   : req.headers['api-key'];
  // if (!providedKey || !timingSafeEqual(
  //   Buffer.from(env.SCHEDULER_API_KEY),
  //   Buffer.from(providedKey ?? '')
  // )) {
  //   throw createHttpError.Unauthorized('Missing or incorrect api-key');
  // }

  const installations = await scan(installationsTable)
  await Promise.all(installations.map(async (installation) => {
    try {
      await handleInstallation(installation)
    } catch (err) {
      console.error(`Error handling installation: ${installation.id}`)
      console.error(err)
    }
  }));

  res.status(200).json({ 'status': 'Complete' })
}

const handleInstallation = async (installation: Installation) => {
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
  const participants = (await scan(participantsTableFor(installation)))
    // We filter in JS, rather than pushing the filters to Airtable, because:
    // - This is faster: Airtable is really slow at applying filters.
    // - This is less complex: Otherwise we'd need to handle custom mappings.
    .filter(p => p.enabled && p.slackEmail !== undefined)
    .map(p => ({
      ...p,
      slackId: findSlackId(p, members),
    }));

  const matches = match(participants)

  await Promise.all(matches.map(async match => {
    const res = await slack.conversations.open({
      users: match.map(p => p.slackId).join(',')
    })

    const channelId = res.channel?.id
    if (!channelId) {
      throw new Error(`Failed to open mpim with ${match.map(p => p.slackId)} in installation ${installation.id}`)
    }

    const meeting = await insert(meetingsTable, {
      installationId: installation.id,
      createdAt: Math.floor(new Date().getTime() / 1000),
      lastModifiedAt: Math.floor(new Date().getTime() / 1000),
      participantIdsJson: JSON.stringify(match.map(p => p.id)),
      slackMpim: channelId,
      state: 'PENDING',
    })

    // TODO: flesh this out with better text.
    const text = `It's a match! <@${match[0].slackId}>, arrange a time to have a chat with ${match.slice(1).map(p => `<@${p.slackId}>`).join(' and ')}.\n\nSome topics you might want to get your conversation started with are:\n • What brought to to BlueDot Impact's programme?\n • Which resources were most interesting to you this week, and why?\n • What things outside of the programme are you up to?`
    await slack.chat.postMessage({
      channel: channelId,
      text,
      blocks: makeMessage(text, [
        { text: ":white_check_mark: We've organised a meeting", id: ACTION_IDS.CONFIRM_MEETING_BUTTON, value: meeting.id },
        { text: ":x: We're not going to meet", id: ACTION_IDS.DECLINE_MEETING_BUTTON, value: meeting.id },
      ]),
    })
  }))
}

const match = <T>(participants: T[]): [T, T][] => {
  // TODO: improve logic, maybe with A/B testing of random and based on dimensions
  const matches: [T, T][] = []
  const copied: T[] = [...participants];
  while (copied.length >= 2) {
    matches.push([randomFrom(copied), randomFrom(copied)])
  }
  return matches;
}

const randomFrom = <T>(arr: T[]): T => {
  return arr.splice(Math.floor(Math.random()*arr.length), 1)[0]
}
