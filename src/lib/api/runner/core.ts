import { WebClient as SlackWebClient } from '@slack/web-api';
import { scan } from '../db/common';
import { getSlackData } from '../slack';
import { getSlackParticipantAirtableLink, slackAlert } from '../slackAlert';
import { Installation, Meeting, participantsTableFor } from '../db/tables';
import { followUpper } from './followUpper';
import { matcher } from './matcher';

export const handleInstallation = async (installation: Installation, meetings: Meeting[]) => {
  // Setup Slack client for this installation
  const slack = new SlackWebClient(
    JSON.parse(installation.slackInstallationJson).bot.token,
    { teamId: installation.slackTeamId },
  );

  // Get all the people to match
  const { members } = await slack.users.list();
  if (members === undefined) {
    throw new Error(`Failed to get Slack members for installation ${installation.id}`);
  }
  const participants = (await scan(
    participantsTableFor(installation),
    installation.participantsViewId ? { view: installation.participantsViewId } : undefined,
  ))
    // We filter in JS, rather than pushing the filters to Airtable, because:
    // - This is faster: Airtable is really slow at applying filters.
    // - This is less complex: Otherwise we'd need to handle custom mappings.
    .filter((p) => {
      if (p.slackEmail === undefined) {
        slackAlert(`Warning: Installation ${installation.name} skipped participant ${p.id} because they don't have a Slack email. ${getSlackParticipantAirtableLink(installation, p.id)}.`);
        return false;
      }
      return true;
    })
    .flatMap((p) => {
      try {
        return {
          ...p,
          ...getSlackData(p, members),
        };
      } catch (err) {
        slackAlert(`Warning: Installation ${installation.name} skipped participant ${p.id} because we couldn't match their Slack email to a Slack user. ${getSlackParticipantAirtableLink(installation, p.id)}.`);
        return [];
      }
    });

  await matcher(slack, installation, participants, meetings);
  await followUpper(slack, installation, participants, meetings);
};
