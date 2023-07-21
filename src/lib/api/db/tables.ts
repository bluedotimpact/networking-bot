import env from '../env';
import { Table, Item } from './common/mapping/types';

export interface Participant extends Item {
  'slackEmail': string,
  'biography': string,
  'dimensions': number[],
}

export const participantsTableFor = (installation: Installation): Table<Participant> => ({
  name: 'participant',
  baseId: installation.participantsBaseId,
  tableId: installation.participantsTableId,
  schema: {
    slackEmail: 'string',
    biography: 'string',
    dimensions: 'number[]',
  },
  mappings: {
    slackEmail: installation.participantsSlackEmailFieldName,
    biography: installation.participantsBiographyFieldName,
    dimensions: JSON.parse(installation.participantsDimensionFieldNamesJson) as string[],
  },
});

export interface Installation extends Item {
  'name': string,
  'slackTeamId': string,
  'slackInstallationJson': string,
  'participantsBaseId': string,
  'participantsTableId': string,
  'participantsViewId': string | null,
  'participantsSlackEmailFieldName': string,
  'participantsBiographyFieldName': string,
  /** @example `["mlSkill", "careerLevel"]` */
  'participantsDimensionFieldNamesJson': string,
  'introMessage': string,
}

export const installationsTable: Table<Installation> = {
  name: 'installation',
  baseId: env.AIRTABLE_BASE_ID,
  tableId: env.AIRTABLE_INSTALLATION_TABLE_ID,
  schema: {
    name: 'string',
    slackTeamId: 'string',
    slackInstallationJson: 'string',
    participantsBaseId: 'string',
    participantsTableId: 'string',
    participantsViewId: 'string | null',
    participantsSlackEmailFieldName: 'string',
    participantsBiographyFieldName: 'string',
    participantsDimensionFieldNamesJson: 'string',
    introMessage: 'string',
  },
  mappings: {
    name: 'Name',
    slackTeamId: 'Slack team ID',
    slackInstallationJson: 'Slack installation JSON',
    participantsBaseId: 'Participants base ID',
    participantsTableId: 'Participants table ID',
    participantsViewId: 'Participants view ID',
    participantsSlackEmailFieldName: 'Participants Slack email field name',
    participantsBiographyFieldName: 'Participants biography field name',
    participantsDimensionFieldNamesJson: 'Participants dimension field names JSON',
    introMessage: 'Intro message',
  }
};

export interface Meeting extends Item {
  'slackMpim': string,
  'installationId': string,
  'participantIdsJson': string,
  'createdAt': number,
  'lastModifiedAt': number,
  'state': 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'DECLINED',
  'participantLinks': string,
}

export const meetingsTable: Table<Meeting> = {
  name: 'meeting',
  baseId: env.AIRTABLE_BASE_ID,
  tableId: env.AIRTABLE_MEETING_TABLE_ID,
  schema: {
    slackMpim: 'string',
    installationId: 'string',
    participantIdsJson: 'string',
    createdAt: 'number',
    lastModifiedAt: 'number',
    state: 'string',
    participantLinks: 'string',
  },
  mappings: {
    slackMpim: 'Slack MPIM',
    installationId: 'Installation ID',
    participantIdsJson: 'Participant IDs JSON',
    createdAt: 'Created at',
    lastModifiedAt: 'Last modified at',
    state: 'State',
    participantLinks: 'Participant links',
  }
};

export interface MeetingFeedback extends Item {
  'participantId': string,
  'meetingId': string,
  'value': number,
  'createdAt': number,
  'participantLinks': string,
}

export const meetingFeedbacksTable: Table<MeetingFeedback> = {
  name: 'meetingFeedback',
  baseId: env.AIRTABLE_BASE_ID,
  tableId: env.AIRTABLE_MEETING_FEEDBACK_TABLE_ID,
  schema: {
    participantId: 'string',
    meetingId: 'string',
    value: 'number',
    createdAt: 'number',
    participantLinks: 'string',
  },
  mappings: {
    participantId: 'Participant ID',
    meetingId: 'Meeting ID',
    value: 'Value',
    createdAt: 'Created at',
    participantLinks: 'Participant links',
  }
};

export interface GlobalSetting extends Item {
  'name': string,
  'value': string,
}

export const globalSettingsTable: Table<GlobalSetting> = {
  name: 'globalSetting',
  baseId: env.AIRTABLE_BASE_ID,
  tableId: env.AIRTABLE_GLOBAL_SETTING_TABLE_ID,
  schema: {
    name: 'string',
    value: 'string',
  },
  mappings: {
    name: 'Name',
    value: 'Value',
  }
};
