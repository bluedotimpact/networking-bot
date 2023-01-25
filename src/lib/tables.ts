import env from "@/lib/env"

export type ToString<T> = 
  T extends string ? "string" :
  T extends boolean ? "boolean" :
  T extends number ? "number" :
  never;

export type FromString<T> = 
  T extends "string" ? string :
  T extends "boolean" ? boolean :
  T extends "number" ? number :
  never;

export type BaseTypeStrings = ToString<any>;

export interface Item {
  id: string
}

export interface Table<T extends Item> {
  name: string,
  baseId: string,
  tableId: string,
  schema: { [k in keyof T]: ToString<T[k]> } ,
}

export interface Participant extends Item {
  'Slack email': string,
  '[netbot] Enabled': boolean,
  'ML skill': number,
  'Career level': number,
}

// TODO: This will probably need to depend on the installation
// Or at least we need to sync data in from somewhere, and add the workspace id
export const participantsTable: Table<Participant> = {
  name: 'participant',
  baseId: env.AIRTABLE_PARTICIPANTS_BASE_ID,
  tableId: env.AIRTABLE_PARTICIPANTS_TABLE_ID,
  schema: {
    id: 'string',
    'Slack email': 'string',
    '[netbot] Enabled': 'boolean',
    'ML skill': 'number',
    'Career level': 'number',
  },
}

export interface Installation extends Item {
  'teamId': string,
  'json': string,
}

export const installationsTable: Table<Installation> = {
  name: 'installation',
  baseId: env.AIRTABLE_INSTALLATIONS_BASE_ID,
  tableId: env.AIRTABLE_INSTALLATIONS_TABLE_ID,
  schema: {
    id: 'string',
    teamId: 'string',
    json: 'string',
  },
}

export interface Meeting extends Item {
  'mpim': string,
  'participantIds': string,
  // TODO: use dates?
  'createdAt': number,
  'followedUpAt': number,
  'completed': boolean,
}

export const meetingsTable: Table<Meeting> = {
  name: 'meeting',
  baseId: env.AIRTABLE_MEETINGS_BASE_ID,
  tableId: env.AIRTABLE_MEETINGS_TABLE_ID,
  schema: {
    id: 'string',
    mpim: 'string',
    participantIds: 'string',
    createdAt: 'number',
    followedUpAt: 'number',
    completed: 'boolean',
  },
}

export interface MeetingFeedback extends Item {
  'participantId': string,
  'meetingId': string,
  'value': number,
  'createdAt': number,
}

export const meetingFeedbacksTable: Table<MeetingFeedback> = {
  name: 'meeting',
  baseId: env.AIRTABLE_MEETING_FEEDBACKS_BASE_ID,
  tableId: env.AIRTABLE_MEETING_FEEDBACKS_TABLE_ID,
  schema: {
    id: 'string',
    participantId: 'string',
    meetingId: 'string',
    value: 'number',
    createdAt: 'number',
  },
}
