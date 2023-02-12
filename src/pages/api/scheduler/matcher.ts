import { insert, scan } from '@/lib/db'
import { Installation, installationsTable, meetingsTable, Participant, Table } from '@/lib/tables'
import type { NextApiRequest, NextApiResponse } from 'next'
import { WebClient, UsersListResponse } from '@slack/web-api'
import { timingSafeEqual } from 'node:crypto'
import env from '@/lib/env'
import createHttpError from 'http-errors'
import { ACTION_IDS, MessageBlocks } from '../slack/events'

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

  // Setup participants table for this installation
  const participantsTable: Table<Participant> = {
    name: 'participant',
    baseId: installation.participantsBaseId,
    tableId: installation.participantsTableId,
    schema: {
      'slackEmail': 'string',
      'enabled': 'boolean',
      'dimensions': 'number[]',
    },
    mappings: {
      'slackEmail': installation.participantsSlackEmailFieldName, 
      'enabled': installation.participantsEnabledFieldName, 
      'dimensions': JSON.parse(installation.participantsDimensionFieldNamesJson),
    },
  }

  // Get all the people to match
  const members = (await slack.users.list()).members
  if (members === undefined) {
    throw new Error(`Failed to get Slack members for installation ${installation.id}`)
  }
  const participants = (await scan(participantsTable))
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
    const blocks: MessageBlocks<true> = [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text,
      },
    }, {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: ":white_check_mark: We've organised a meeting",
            emoji: true,
          },
          action_id: ACTION_IDS.CONFIRM_MEETING_BUTTON,
          value: meeting.id,
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: ":x: We're not going to meet",
            emoji: true,
          },
          action_id: ACTION_IDS.CANCEL_MEETING_BUTTON,
          value: meeting.id,
        },
      ],
    }]
    await slack.chat.postMessage({
      channel: channelId,
      text,
      blocks,
    })
  }))
}

const findSlackId = (
  participant: Participant,
  members: NonNullable<UsersListResponse["members"]>
): string => {
  const slackId = members.find(m => {
    return m.is_email_confirmed && m.profile?.email === participant.slackEmail
  })?.id;
  if (slackId === undefined) {
    throw new Error(`Failed to find Slack member for participant ${participant.id}`)
  }
  return slackId;
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
