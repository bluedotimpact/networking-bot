import env from './env';

export type BaseTypeStrings = NonNullToString<any> | ToString<any>;

type NonNullToString<T> =
  T extends string ? 'string' :
    T extends number ? 'number' :
      T extends boolean ? 'boolean' :
        T extends number[] ? 'number[]' :
          T extends string[] ? 'string[]' :
            T extends boolean[] ? 'boolean[]' :
              never;

export type ToString<T> =
  null extends T ? `${NonNullToString<T>} | null` : NonNullToString<T>;

export type FromString<T> =
  T extends 'string' ? string :
    T extends 'string | null' ? string | null :
      T extends 'number' ? number :
        T extends 'number | null' ? number | null :
          T extends 'boolean' ? boolean :
            T extends 'boolean | null' ? boolean | null :
              T extends 'number[]' ? number[] :
                T extends 'number[] | null' ? number[] | null :
                  T extends 'string[]' ? string[] :
                    T extends 'string[] | null' ? string[] | null :
                      T extends 'boolean[]' ? boolean[] :
                        T extends 'boolean[] | null' ? boolean[] | null :
                          never;

export interface TypeDef {
  single: 'string' | 'number' | 'boolean',
  array: boolean,
  nullable: boolean,
}

export const parseType = (t: BaseTypeStrings): TypeDef => {
  if (t.endsWith('[] | null')) {
    return {
      single: t.slice(0, -('[] | null'.length)) as TypeDef['single'],
      array: true,
      nullable: true,
    };
  }

  if (t.endsWith('[]')) {
    return {
      single: t.slice(0, -('[]'.length)) as TypeDef['single'],
      array: true,
      nullable: false,
    };
  }

  if (t.endsWith(' | null')) {
    return {
      single: t.slice(0, -(' | null'.length)) as TypeDef['single'],
      array: false,
      nullable: true,
    };
  }

  return {
    single: t as TypeDef['single'],
    array: false,
    nullable: false,
  };
};

// Value for possible field mapping
// For arrays, this may be:
// - an array of field names (each holding a single value of the array type); or
// - one field name (holding an array of values of the correct type)
// Otherwise this must be a single field name
export type MappingValue<T> = T extends any[] ? string | string[] : string;

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

export const participantsTableFor = (installation: Installation): Table<Participant> => ({
  name: 'participant',
  baseId: installation.participantsBaseId,
  tableId: installation.participantsTableId,
  schema: {
    slackEmail: 'string',
    dimensions: 'number[]',
  },
  mappings: {
    slackEmail: installation.participantsSlackEmailFieldName,
    dimensions: JSON.parse(installation.participantsDimensionFieldNamesJson),
  },
});

export interface Participant extends Item {
  'slackEmail': string,
  'dimensions': number[],
}

export interface Installation extends Item {
  'name': string,
  'slackTeamId': string,
  'slackInstallationJson': string,
  'participantsBaseId': string,
  'participantsTableId': string,
  'participantsViewId': string | null,
  'participantsSlackEmailFieldName': string,
  'participantsDimensionFieldNamesJson': string,
}

export const installationsTable: Table<Installation> = {
  name: 'installation',
  baseId: env.AIRTABLE_INSTALLATIONS_BASE_ID,
  tableId: env.AIRTABLE_INSTALLATIONS_TABLE_ID,
  schema: {
    name: 'string',
    slackTeamId: 'string',
    slackInstallationJson: 'string',
    participantsBaseId: 'string',
    participantsTableId: 'string',
    participantsViewId: 'string | null',
    participantsSlackEmailFieldName: 'string',
    participantsDimensionFieldNamesJson: 'string',
  },
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
  baseId: env.AIRTABLE_MEETINGS_BASE_ID,
  tableId: env.AIRTABLE_MEETINGS_TABLE_ID,
  schema: {
    slackMpim: 'string',
    installationId: 'string',
    participantIdsJson: 'string',
    createdAt: 'number',
    lastModifiedAt: 'number',
    state: 'string',
    participantLinks: 'string',
  },
};

export interface MeetingFeedback extends Item {
  'participantId': string,
  'meetingId': string,
  'value': number,
  'createdAt': number,
  'participantLinks': string,
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
    participantLinks: 'string',
  },
};

// TODO: scheduler run result table?
