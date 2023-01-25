import { scan } from '@/lib/db'
import { installationsTable, Participant, participantsTable } from '@/lib/tables'
import type { NextApiRequest, NextApiResponse } from 'next'
import { WebClient } from '@slack/web-api'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // TODO: don't hardcode
  const installation = (await scan(installationsTable))[0]
  const client = new WebClient(
    JSON.parse(installation.json).bot.token,
    { teamId: installation.teamId },
  )

  // client.chat.postMessage({
  //   channel: 'C04HN1AK34P',
  //   text: 'Test message'
  // })

  const members = (await client.users.list()).members
  if (members === undefined) {
    throw new Error(`Failed to get Slack members for installation ${installation.teamId}`)
  }
  const slackIdFor = (participant: Participant): string => {
    const slackId = members.find(m => {
      return m.is_email_confirmed && m.profile?.email === participant['Slack email']
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

  console.log(participants)

  res.status(200).json({ participants })
}
