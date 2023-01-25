import { App } from "@slack/bolt";
import { AppRunner } from "@seratch_/bolt-http-runner";
import env from "@/lib/env";
import { insert, scan } from "@/lib/db";
import { installationsTable } from "@/lib/tables";

export const appRunner = new AppRunner({
  signingSecret: env.SLACK_SIGNING_SECRET,
  clientId: env.SLACK_CLIENT_ID,
  clientSecret: env.SLACK_CLIENT_SECRET,
  stateSecret: env.SLACK_STATE_SECRET,
  redirectUri: env.SLACK_REDIRECT_URI,
  scopes: ["chat:write", "mpim:write", "users:read", "users:read.email"],
  installationStore: {
    storeInstallation: async (installation) => {
      const teamId = installation.isEnterpriseInstall
        ? installation.enterprise!.id
        : installation.team!.id;

      await insert(installationsTable, { teamId, json: JSON.stringify(installation) });
    },
    fetchInstallation: async (installQuery) => {
      const teamId = installQuery.isEnterpriseInstall
        ? installQuery.enterpriseId!
        : installQuery.teamId!;

      const installations = await scan(installationsTable, `teamId = ${teamId}`)
      if (installations.length === 0) {
        throw new Error(`Installation not found for team ${teamId}`)
      }
      
      if (installations.length > 1) {
        throw new Error(`Multiple installations found for team ${teamId}`)
      }

      return JSON.parse(installations[0].json);
    },
    deleteInstallation: async (installQuery) => {
      throw new Error('Not implemented');
    },
  },
});

const app = new App(appRunner.appOptions());

appRunner.setup(app);
