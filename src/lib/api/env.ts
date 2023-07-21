import { validateEnv } from '../validateEnv';

const envVars = [
  'AIRTABLE_BASE_ID',
  'AIRTABLE_INSTALLATION_TABLE_ID',
  'AIRTABLE_MEETING_TABLE_ID',
  'AIRTABLE_MEETING_FEEDBACK_TABLE_ID',
  'AIRTABLE_GLOBAL_SETTING_TABLE_ID',
  'AIRTABLE_PERSONAL_ACCESS_TOKEN',

  'SLACK_CLIENT_ID',
  'SLACK_CLIENT_SECRET',
  'SLACK_SIGNING_SECRET',
  'SLACK_STATE_SECRET',
  'SLACK_REDIRECT_URI',

  'SCHEDULER_API_KEY',

  'ALERTS_SLACK_CHANNEL_ID',
  'ALERTS_SLACK_BOT_TOKEN',

  'NEXT_PUBLIC_GOOGLE_LOGIN_CLIENT_ID',
] as const;

export type Env = Record<(typeof envVars)[number], string>;

const env: Env = validateEnv(process.env, envVars);

export default env;
