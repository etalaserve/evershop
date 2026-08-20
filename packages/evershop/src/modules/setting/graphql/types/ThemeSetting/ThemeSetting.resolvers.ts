import { Setting } from '../../../services/setting.js';

/** Mirrors saveSetting's shape for is_json rows: JSON.parse the stored string, null on absence/malformed data. */
function readJson(setting: Setting[], name: string): Record<string, unknown> | null {
  const row = setting.find((s) => s.name === name);
  if (!row || typeof row.value !== 'string' || row.value.length === 0) {
    return null;
  }
  try {
    return JSON.parse(row.value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default {
  Setting: {
    themeTokens: (setting: Setting[]) => readJson(setting, 'themeTokens')
  }
};
