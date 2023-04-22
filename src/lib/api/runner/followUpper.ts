import { WebClient } from '@slack/web-api';
import { getSlackAirtableLink, slackAlert } from 'src/lib/api/slackAlert';
import { update } from '../db';
import { makeMessage } from '../slack';
import {
  Installation, Meeting, meetingsTable, Participant,
} from '../db/tables';
import { now } from '../../timestamp';
import { getGlobalSettings } from '../globalSettings';

const shouldFollowUp = (meeting: Meeting) => {
  // Already modified recently, no need for a reminder
  const RECENTLY_UPDATED_IN_SECONDS = 6 * 86400; // 6 days
  if (now() < meeting.lastModifiedAt + RECENTLY_UPDATED_IN_SECONDS) {
    return false;
  }

  // No further actions to take
  if (meeting.state === 'COMPLETED' || meeting.state === 'DECLINED') {
    return false;
  }

  return true;
};

export const followUpper = async (
  slack: WebClient,
  installation: Installation,
  participants: (Participant & { slackId: string })[],
  /** Meetings for the installation */
  meetings: Meeting[],
) => {
  const meetingsToFollowUp = meetings.filter(shouldFollowUp);

  await Promise.all(meetingsToFollowUp.map(async (meeting) => {
    const participantIds: string[] = JSON.parse(meeting.participantIdsJson);
    const participantsInMeeting = participants.filter((p) => participantIds.includes(p.id));

    if (participantIds.length !== participantsInMeeting.length) {
      slackAlert(`Warning: Installation ${installation.name} failed to follow up meeting ${meeting.id} because we couldn't find the participants in Airtable or Slack. ${getSlackAirtableLink({ baseId: meetingsTable.baseId, tableId: meetingsTable.tableId, recordId: meeting.id })}.`);
      return;
    }

    const res = await slack.conversations.open({
      users: participantsInMeeting.map((p) => p.slackId).join(','),
    });

    const channelId = res.channel?.id;
    if (!channelId) {
      slackAlert(`Error: Failed to open mpim with ${participantsInMeeting.map((p) => p.slackId)} in installation ${installation.id}. ${getSlackAirtableLink({ baseId: meetingsTable.baseId, tableId: meetingsTable.tableId, recordId: meeting.id })}.`);
      return;
    }

    const text = (await getGlobalSettings()).chaseMeetingGroupMessage;
    await slack.chat.postMessage({
      channel: channelId,
      text,
      blocks: makeMessage(text),
    });

    await update(meetingsTable, { id: meeting.id, lastModifiedAt: now() });
  }));
};
