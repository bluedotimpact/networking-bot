import { insert } from "@/lib/db"
import { ACTION_IDS, makeMessage } from "@/lib/slack"
import { Installation, Meeting, meetingsTable, Participant } from "@/lib/tables"
import { now } from "@/lib/timestamp"
import { WebClient } from "@slack/web-api"

export const matcher = async (
  slack: WebClient,
  installation: Installation,
  participants: (Participant & { slackId: string })[],
  meetings: Meeting[],
) => {
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
      createdAt: now(),
      lastModifiedAt: now(),
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
