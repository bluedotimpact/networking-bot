import env from "@/lib/env"

export type ToString<T> = 
  T extends string ? "string" :
  T extends boolean ? "boolean" :
  T extends number ? "number" :
  T extends number[] ? "number[]" :
  T extends string[] ? "string[]" :
  never;

export type FromString<T> = 
  T extends "string" ? string :
  T extends "boolean" ? boolean :
  T extends "number" ? number :
  T extends "number[]" ? number[] :
  T extends "string[]" ? string[] :
  never;

// Value for possible field mapping
// For arrays, this may be:
// - an array of field names (each holding a single value of the array type); or
// - one field name (holding an array of values of the correct type)
// Otherwise this must be a single field name
export type MappingValue<T> = T extends any[] ? string | string[] : string;

export type BaseTypeStrings = ToString<any>;

export interface Item {
  id: string
}

export interface Table<T extends Item> {
  name: string,
  baseId: string,
  tableId: string,
  schema: { [k in keyof Omit<T, 'id'>]: ToString<T[k]> },
  mappings?: { [k in keyof Omit<T, 'id'>]: MappingValue<T[k]> }
}

export interface Participant extends Item {
  'slackEmail': string,
  'enabled': boolean,
  'dimensions': number[],
}

export const participantsTable: Table<Participant> = {
  name: 'participant',
  baseId: env.AIRTABLE_PARTICIPANTS_BASE_ID,
  tableId: env.AIRTABLE_PARTICIPANTS_TABLE_ID,
  schema: {
    'slackEmail': 'string',
    'enabled': 'boolean',
    'dimensions': 'number[]',
  },
  mappings: {
    'slackEmail': 'Slack email', 
    'enabled': '[netbot] Enabled', 
    'dimensions': ['ML Skill', 'Career level'], 
  }
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
    participantId: 'string',
    meetingId: 'string',
    value: 'number',
    createdAt: 'number',
  },
}
