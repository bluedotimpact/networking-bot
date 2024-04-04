import { BlockAction, ButtonAction } from '@slack/bolt';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getParticipantAirtableLink } from '../../../lib/airtableLink';
import { getGlobalSettings } from '../../../lib/api/globalSettings';
import { apiRoute } from '../../../lib/api/apiRoute';
import db, {
  installationsTable, meetingFeedbacksTable, meetingsTable, participantsTableFor,
} from '../../../lib/api/db';
import {
  acknowledgeSlackButton, ACTION_IDS, getSlackData, makeMessage,
} from '../../../lib/api/slack';
import { now } from '../../../lib/timestamp';
import { app, appRunner } from './_runner';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default apiRoute(async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  await appRunner.handleEvents(req, res);
}, 'insecure_no_auth');

app.action<BlockAction<ButtonAction>>(
  ACTION_IDS.CONFIRM_MEETING_BUTTON,
  async (args) => {
    const meeting = await db.update(meetingsTable, {
      id: args.action.value,
      lastModifiedAt: now(),
      state: 'CONFIRMED',
    });

    const text = (await getGlobalSettings()).confirmMeetingGroupMessage;
    await args.say({
      text,
      blocks: makeMessage(text, [
        { text: ':raised_hands: We met!', id: ACTION_IDS.COMPLETE_MEETING_BUTTON, value: meeting.id },
        { text: ':x: We cancelled our meeting', id: ACTION_IDS.DECLINE_MEETING_BUTTON, value: meeting.id },
      ]),
    });

    await acknowledgeSlackButton(args);
  },
);

app.action<BlockAction<ButtonAction>>(
  ACTION_IDS.COMPLETE_MEETING_BUTTON,
  async (args) => {
    const meeting = await db.update(meetingsTable, {
      id: args.action.value,
      lastModifiedAt: now(),
      state: 'COMPLETED',
    });

    const groupMessage = (await getGlobalSettings()).completeMeetingGroupMessage;
    await args.say({ text: groupMessage, blocks: makeMessage(groupMessage) });

    const installation = await db.get(installationsTable, meeting.installationId);
    const participantsTable = participantsTableFor(installation);
    const { members } = await args.client.users.list();
    if (members === undefined) {
      throw new Error(`Failed to get Slack members for installation ${installation.id}`);
    }

    const participantIds: string[] = JSON.parse(meeting.participantIdsJson);
    const participants = await Promise.all(participantIds.map(async (participantId) => {
      const participant = await db.get(participantsTable, participantId);
      return {
        ...participant,
        ...getSlackData(participant, members),
      };
    }));

    await Promise.all(participants.map(async (participant) => {
      const individualMessage = (await getGlobalSettings())
        .completeMeetingIndividualMessage
        .replaceAll(
          '{{otherParticipants}}',
          participants.filter((p) => p !== participant).map((p) => `<@${p.slackId}>`).join(' and '),
        );

      return args.client.chat.postMessage({
        channel: participant.slackId,
        text: individualMessage,
        blocks: makeMessage(individualMessage, [
          { text: ':one: Not at all', id: ACTION_IDS.RATE_MEETING_BUTTON_1, value: JSON.stringify([meeting.id, participant.id, 1]) },
          { text: ':two: Slightly', id: ACTION_IDS.RATE_MEETING_BUTTON_2, value: JSON.stringify([meeting.id, participant.id, 2]) },
          { text: ':three: Moderately', id: ACTION_IDS.RATE_MEETING_BUTTON_3, value: JSON.stringify([meeting.id, participant.id, 3]) },
          { text: ':four: Very', id: ACTION_IDS.RATE_MEETING_BUTTON_4, value: JSON.stringify([meeting.id, participant.id, 4]) },
          { text: ':five: Extremely', id: ACTION_IDS.RATE_MEETING_BUTTON_5, value: JSON.stringify([meeting.id, participant.id, 5]) },
        ]),
      });
    }));

    await acknowledgeSlackButton(args);
  },
);

app.action<BlockAction<ButtonAction>>(
  ACTION_IDS.DECLINE_MEETING_BUTTON,
  async (args) => {
    const meeting = await db.update(meetingsTable, {
      id: args.action.value,
      lastModifiedAt: now(),
      state: 'DECLINED',
    });

    const text = (await getGlobalSettings()).declineMeetingGroupMessage;
    await args.say({
      text,
      blocks: makeMessage(text, [
        { text: ':leftwards_arrow_with_hook: Undo, we are going to meet!', id: ACTION_IDS.CONFIRM_MEETING_BUTTON, value: meeting.id },
      ]),
    });

    await acknowledgeSlackButton(args);
  },
);

app.action<BlockAction<ButtonAction>>(
  /^RATE_MEETING_BUTTON_\d$/,
  async (args) => {
    const [meetingId, participantId, rating]: [string, string, number] = JSON.parse(args.action.value);

    const meeting = await db.get(meetingsTable, meetingId);
    const installation = await db.get(installationsTable, meeting.installationId);

    await db.insert(meetingFeedbacksTable, {
      meetingId,
      participantId,
      createdAt: now(),
      value: rating,
      participantLinks: `[${args.body.user.name}](${getParticipantAirtableLink(installation, participantId)})`,
    });

    const text = (await getGlobalSettings()).feedbackMeetingIndividualMessage;
    await args.say({ text, blocks: makeMessage(text) });

    await acknowledgeSlackButton(args);
  },
);
