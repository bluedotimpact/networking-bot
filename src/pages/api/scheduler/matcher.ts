import { scan } from '@/lib/db'
import { installationsTable, Participant, participantsTable } from '@/lib/tables'
import type { NextApiRequest, NextApiResponse } from 'next'
import { WebClient } from '@slack/web-api'
import { timingSafeEqual } from 'node:crypto'
import env from '@/lib/env'
import createHttpError from 'http-errors'

export default async function handler(
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

  // TODO: don't hardcode
  const installation = (await scan(installationsTable))[0]
  const slack = new WebClient(
    JSON.parse(installation.json).bot.token,
    { teamId: installation.teamId },
  )

  // client.chat.postMessage({
  //   channel: 'C04HN1AK34P',
  //   text: 'Test message'
  // })

  const members = (await slack.users.list()).members
  if (members === undefined) {
    throw new Error(`Failed to get Slack members for installation ${installation.teamId}`)
  }
  const slackIdFor = (participant: Participant): string => {
    const slackId = members.find(m => {
      return m.is_email_confirmed && m.profile?.email === participant.slackEmail
    })?.id;
    if (slackId === undefined) {
      throw new Error(`Failed to find Slack member for participant ${participant.id} in installation ${installation.teamId}`)
    }
    return slackId;
  }

  const participants = (await scan(
    participantsTable,
    `AND({[netbot] Enabled} = TRUE(), {Slack email} != "")`
  )).map(p => ({
    ...p,
    slackId: slackIdFor(p),
  }))

  const matches = match(participants)

  await Promise.all(matches.map(async match => {
    const res = await slack.conversations.open({
      users: match.map(p => p.slackId).join(',')
    })
    
    const channelId = res.channel?.id
    if (!channelId) {
      throw new Error(`Failed to open mpim with ${match.map(p => p.slackId)} in installation ${installation.teamId}`)
    }

    await slack.chat.postMessage({
      channel: channelId,
      // TODO: flesh this out with better text.
      text: `You've been matched up for a chat! <@${match[0].slackId}>, you should arrange a time to have a virtual (or in-person, if that works) coffee with ${match.slice(1).map(p => `<@${p.slackId}>`).join(' and ')}.\n\nSome topics you might want to get your conversation started with are:\n • What brought to to BlueDot Impact's programme?\n • What resources did you find the most interesting this week, and why?\n • What things outside of the programme are you up to?`,
    })
  }))

  res.status(200).json(matches)
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