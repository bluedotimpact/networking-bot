import { test, expect } from 'vitest';
import { getParticipantAirtableLink, getAirtableLink } from './airtableLink';
import { Installation } from './api/db/tables';

test('getAirtableLink', () => {
  const baseId = 'app123';
  const tableId = 'tbl456';
  const viewId = 'viw789';
  const recordId = 'rec012';

  const result = getAirtableLink({
    baseId, tableId, viewId, recordId,
  });
  expect(result).toBe(`https://airtable.com/${baseId}/${tableId}/${viewId}/${recordId}`);
});

test('getParticipantAirtableLink', () => {
  const installation: Installation = {
    participantsBaseId: 'app123',
    participantsTableId: 'tbl456',
    participantsViewId: 'viw789',

    id: 'rec123',
    name: 'Installation name',
    participantsDimensionFieldNamesJson: '[]',
    participantsSlackEmailFieldName: 'slackEmail',
    participantsBiographyFieldName: 'Biography',
    slackInstallationJson: '{}',
    slackTeamId: 'team_123',
    introMessage: '',
  };
  const recordId = 'rec012';

  const result = getParticipantAirtableLink(installation, recordId);
  expect(result).toBe(`https://airtable.com/${installation.participantsBaseId}/${installation.participantsTableId}/${installation.participantsViewId}/${recordId}`);
});
