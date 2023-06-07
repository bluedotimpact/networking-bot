import { App } from '@slack/bolt';
import { AppRunner } from '@seratch_/bolt-http-runner';
import env from '../../../lib/api/env';
import { insert, remove, scan } from '../../../lib/api/db/common';
import { installationsTable } from '../../../lib/api/db/tables';

export const appRunner = new AppRunner({
  signingSecret: env.SLACK_SIGNING_SECRET,
  clientId: env.SLACK_CLIENT_ID,
  clientSecret: env.SLACK_CLIENT_SECRET,
  stateSecret: env.SLACK_STATE_SECRET,
  redirectUri: env.SLACK_REDIRECT_URI,
  scopes: ['chat:write', 'mpim:write', 'users:read', 'users:read.email'],
  installationStore: {
    storeInstallation: async (installation) => {
      const teamId = installation.isEnterpriseInstall
        ? installation.enterprise!.id
        : installation.team!.id;

      // Insert the defaults for new installations
      // To edit these for a particular installation, do this in Airtable
      await insert(installationsTable, {
        name: installation.team?.name ?? installation.enterprise?.name ?? '',
        slackTeamId: teamId,
        slackInstallationJson: JSON.stringify(installation),
        participantsBaseId: '',
        participantsTableId: '',
        participantsViewId: '',
        participantsSlackEmailFieldName: 'slackEmail',
        participantsBiographyFieldName: 'bio',
        participantsDimensionFieldNamesJson: JSON.stringify([]),
        introMessage: `As some starter conversation topics, consider:
• What brought to to BlueDot Impact's programme?
• Which resources were most interesting to you this week, and why?
• What things outside of the programme are you up to?`,
      });
    },
    fetchInstallation: async (installQuery) => {
      const teamId = installQuery.isEnterpriseInstall
        ? installQuery.enterpriseId!
        : installQuery.teamId!;

      const installations = (await scan(installationsTable)).filter((i) => i.slackTeamId === teamId);
      if (installations.length === 0) {
        throw new Error(`Installation not found for team ${teamId}`);
      }

      if (installations.length > 1) {
        throw new Error(`Multiple installations found for team ${teamId}`);
      }

      return JSON.parse(installations[0].slackInstallationJson);
    },
    deleteInstallation: async (installQuery) => {
      const teamId = installQuery.isEnterpriseInstall
        ? installQuery.enterpriseId!
        : installQuery.teamId!;
      await remove(installationsTable, teamId);
    },
  },
});

export const app = new App(appRunner.appOptions());

appRunner.setup(app);
