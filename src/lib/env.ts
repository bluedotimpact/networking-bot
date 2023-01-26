const envVars = [
  "AIRTABLE_PARTICIPANTS_BASE_ID",
  "AIRTABLE_PARTICIPANTS_TABLE_ID",
  "AIRTABLE_INSTALLATIONS_BASE_ID",
  "AIRTABLE_INSTALLATIONS_TABLE_ID",
  "AIRTABLE_MEETINGS_BASE_ID",
  "AIRTABLE_MEETINGS_TABLE_ID",
  "AIRTABLE_MEETING_FEEDBACKS_BASE_ID",
  "AIRTABLE_MEETING_FEEDBACKS_TABLE_ID",
  "AIRTABLE_PERSONAL_ACCESS_TOKEN",

  "SLACK_CLIENT_ID",
  "SLACK_CLIENT_SECRET",
  "SLACK_SIGNING_SECRET",
  "SLACK_STATE_SECRET",
  "SLACK_REDIRECT_URI",

  "SCHEDULER_API_KEY",
] as const;

export type Env = Record<(typeof envVars)[number], string>;

// Validate the environment
const constructEnv = (): Env => {
  const env = {} as Env;

  for (const envVar of envVars) {
    const value = process.env[envVar]?.trim();
    if (value === undefined || value.length === 0) {
      throw new Error('Unset environment variable: ' + envVar);
    }
    env[envVar] = value;
  }

  return env;
}

export default constructEnv();