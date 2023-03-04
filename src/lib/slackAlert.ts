import axios from 'axios';
import env from './env';
import { Installation } from './tables';

export const slackAlert = async (message: string): Promise<void> => {
  console.log('Sending Slack: ' + message);

  return axios({
    method: 'post',
    baseURL: 'https://slack.com/api/',
    url: 'chat.postMessage',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.ALERTS_SLACK_BOT_TOKEN}`,
    },
    data: {
      channel: env.ALERTS_SLACK_CHANNEL_ID,
      text: message,
    },
  }).then(res => {
    if (!res.data.ok) {
      console.error(`Error from Slack API: ${res.data.error}`);
    }
  }).catch(err => {
    console.error(`Error from Slack API: ${err}`);
  });
};

export const getParticipantAirtableLink = (installation: Installation, recordId: string) => {
  return getAirtableLink({
    baseId: installation.participantsBaseId,
    tableId: installation.participantsTableId,
    viewId: installation.participantsViewId ?? undefined,
    recordId,
  })
}

export const getAirtableLink = ({ baseId, tableId, viewId, recordId }: { baseId: string, tableId: string, recordId: string, viewId?: string }) => {
  return `<https://airtable.com/${baseId}/${tableId}${viewId ? `/${viewId}` : ""}/${recordId}|View record in Airtable>`
}