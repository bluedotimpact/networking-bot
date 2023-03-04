const envVars = [
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

  "ALERTS_SLACK_CHANNEL_ID",
  "ALERTS_SLACK_BOT_TOKEN",
] as const;

export type Env = Record<(typeof envVars)[number], string>;

// Validate the environment
const constructEnv = (): Env => {
  const env = {} as Env;
  const unset = []

  for (const envVar of envVars) {
    const value = process.env[envVar]?.trim();
    if (value === undefined || value.length === 0) {
      unset.push(envVar)
      continue;
    }
    env[envVar] = value;
  }

  if (unset.length > 0) {
    throw new Error('Unset environment variables: ' + unset.join(', '));
  }
  
  return env;
}

export default constructEnv();