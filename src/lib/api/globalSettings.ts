import { scan } from './db/common';
import { globalSettingsTable } from './db/tables';

const globalSettingKeys = [
  'introMeetingGroupMessage',
  'confirmMeetingGroupMessage',
  'declineMeetingGroupMessage',
  'completeMeetingGroupMessage',
  'completeMeetingIndividualMessage',
  'feedbackMeetingIndividualMessage',
  'chaseMeetingGroupMessage',
] as const;

export type GlobalSettings = Record<(typeof globalSettingKeys)[number], string>;

let cache: GlobalSettings | null = null;
export const getGlobalSettings = async () => {
  if (cache) return cache;

  const records = await scan(globalSettingsTable);
  const settings = Object.fromEntries(records.map((r) => [r.name, r.value]));
  globalSettingKeys.forEach((key) => {
    if (typeof settings[key] !== 'string') {
      throw new Error(`Missing global setting key ${key}.`);
    }
  });

  cache = settings as GlobalSettings;
  return cache;
};
