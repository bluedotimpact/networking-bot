import { update } from "@/lib/db"
import { makeMessage } from "@/lib/slack"
import { Installation, Meeting, meetingsTable, Participant } from "@/lib/tables"
import { now } from "@/lib/timestamp"
import { WebClient } from "@slack/web-api"

const shouldFollowUp = (meeting: Meeting) => {
  // Already modified recently, no need for a reminder
  const RECENTLY_UPDATED_IN_SECONDS = 6 * 86400 // 6 days
  if (now() < meeting.lastModifiedAt + RECENTLY_UPDATED_IN_SECONDS) {
    return false;
  }

  // No further actions to take
  if (meeting.state === "COMPLETED" || meeting.state === "DECLINED") {
    return false;
  }
  
  return true;
}

export const followUpper = async (
  slack: WebClient,
  installation: Installation,
  participants: (Participant & { slackId: string })[],
  /** Meetings for the installation */
  meetings: Meeting[],
) => {
  const meetingsToFollowUp = meetings.filter(shouldFollowUp)

  await Promise.all(meetingsToFollowUp.map(async meeting => {
    const participantIds: string[] = JSON.parse(meeting.participantIdsJson)
    const participantsInMeeting = participants.filter(p => participantIds.includes(p.id))

    if (participantIds.length !== participantsInMeeting.length) {
      console.warn(`Failed to follow up meeting ${meeting.id}, because can't map participants back to Slack IDs`)
      return;
    }

    const res = await slack.conversations.open({
      users: participantsInMeeting.map(p => p.slackId).join(',')
    })

    const channelId = res.channel?.id
    if (!channelId) {
      console.warn(`Failed to open mpim with ${participantsInMeeting.map(p => p.slackId)} in installation ${installation.id}`)
      return;
    }

    const text = `Hey, I haven't heard any updates on how your meeting is going. So I can understand what's happening, can you click one of the buttons in the previous message?`
    await slack.chat.postMessage({
      channel: channelId,
      text,
      blocks: makeMessage(text),
    })

    await update(meetingsTable, { id: meeting.id, lastModifiedAt: now() })
  }))
}
