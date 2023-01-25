import { Installation } from './api/db/tables';

export const getParticipantAirtableLink = (installation: Installation, recordId: string) => {
  return getAirtableLink({
    baseId: installation.participantsBaseId,
    tableId: installation.participantsTableId,
    viewId: installation.participantsViewId ?? undefined,
    recordId,
  });
};

export const getAirtableLink = ({
  baseId, tableId, viewId, recordId,
}: { baseId: string, tableId: string, recordId: string, viewId?: string }) => {
  return `https://airtable.com/${baseId}/${tableId}${viewId ? `/${viewId}` : ''}/${recordId}`;
};
