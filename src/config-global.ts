import packageJson from '../package.json';

// ----------------------------------------------------------------------

export type ConfigValue = {
  appName: string;
  appVersion: string;
  agentEnabled: boolean;
  agentRichBlocksEnabled: boolean;
  userManageFeatures: {
    bulk: boolean;
    stats: boolean;
    unlock: boolean;
    restore: boolean;
    updateRole: boolean;
  };
};

const envFlag = (key: string, defaultValue: boolean): boolean => {
  const value = import.meta.env[key] as string | undefined;
  if (value === undefined) return defaultValue;
  return value === 'true';
};

export const CONFIG: ConfigValue = {
  appName: 'Apex Quant',
  appVersion: packageJson.version,
  agentEnabled: envFlag('VITE_AGENT_ENABLED', false),
  agentRichBlocksEnabled: envFlag('VITE_AGENT_RICH_BLOCKS_ENABLED', false),
  userManageFeatures: {
    bulk: envFlag('VITE_USER_MANAGE_BULK', true),
    stats: envFlag('VITE_USER_MANAGE_STATS', true),
    unlock: envFlag('VITE_USER_MANAGE_UNLOCK', true),
    restore: envFlag('VITE_USER_MANAGE_RESTORE', true),
    updateRole: envFlag('VITE_USER_MANAGE_UPDATE_ROLE', true),
  },
};
