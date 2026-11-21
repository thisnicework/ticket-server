import type { Database } from './db/index.js';
import type { ApiKey, Tenant } from './db/schema.js';

export type AppVariables = {
  db: Database;
  platformMasterKey: string;
  tenant?: Tenant;
  apiKey?: ApiKey;
};

export type AppEnv = {
  Variables: AppVariables;
};
