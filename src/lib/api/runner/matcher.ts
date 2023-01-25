import { WebClient } from '@slack/web-api';
import { slackAlert } from 'src/lib/api/slackAlert';
import { getParticipantAirtableLink } from 'src/lib/airtableLink';
import { insert } from '../db';
import { ACTION_IDS, makeMessage } from '../slack';
import {
  Installation, Meeting, meetingsTable, Participant,
} from '../db/tables';
import { now } from '../../timestamp';
import { getGlobalSettings } from '../globalSettings';

export const matcher = async (
  slack: WebClient,
  installation: Installation,
  participants: (Participant & { slackId: string, slackName: string | undefined })[],
  // We think we are likely to use this in future matching logic
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  meetings: Meeting[],
) => {
  const matches = match(participants);

  await Promise.all(matches.map(async (match) => {
    const res = await slack.conversations.open({
      users: match.map((p) => p.slackId).join(','),
    });

    const channelId = res.channel?.id;
    if (!channelId) {
      slackAlert(`Error: Failed to open mpim with ${match.map((p) => p.slackId)} in installation ${installation.id}.`);
      return;
    }

    const meeting = await insert(meetingsTable, {
      installationId: installation.id,
      createdAt: now(),
      lastModifiedAt: now(),
      participantIdsJson: JSON.stringify(match.map((p) => p.id)),
      slackMpim: channelId,
      state: 'PENDING',
      participantLinks: `${match.map((p) => `[${p.slackName ?? p.slackEmail}](${getParticipantAirtableLink(installation, p.id)})`).join(', ')}`,
    });

    const biographies = match.filter((p) => p.biography);
    const text = (await getGlobalSettings())
      .introMeetingGroupMessage
      .replaceAll(
        '{{organiser}}',
        `<@${match[0].slackId}>`,
      )
      .replaceAll(
        '{{participantsExcludingOrganiser}}',
        `${match.slice(1).map((p) => `<@${p.slackId}>`).join(' and ')}`,
      )
      .replaceAll(
        '{{installationIntroMessage}}',
        installation.introMessage,
      )
      .replaceAll(
        '{{biographies}}',
        !biographies.length ? '' : `A bit about you:\n\n${biographies.map((b) => `<@${b.slackId}>: ${b.biography.replaceAll('\n', ' ')}`).join('\n\n')}`,
      )
      .trim();

    await slack.chat.postMessage({
      channel: channelId,
      text,
      blocks: makeMessage(text, [
        { text: ":white_check_mark: We've organised a meeting", id: ACTION_IDS.CONFIRM_MEETING_BUTTON, value: meeting.id },
        { text: ":x: We're not going to meet", id: ACTION_IDS.DECLINE_MEETING_BUTTON, value: meeting.id },
      ]),
    });
  }));
};

const match = <T>(participants: T[]): [T, T][] => {
  // TODO: improve logic, maybe with A/B testing of random and based on dimensions
  const matches: [T, T][] = [];
  const copied: T[] = [...participants];
  while (copied.length >= 2) {
    matches.push([randomFrom(copied), randomFrom(copied)]);
  }
  return matches;
};

const randomFrom = <T>(arr: T[]): T => {
  return arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
};
