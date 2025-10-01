import knex, { type Knex } from 'knex';
import knexConfig from '../../knexfile.js';

type EnvironmentKey = 'development' | 'test' | 'production';

let instance: Knex | null = null;

const resolveEnvironment = (): EnvironmentKey => {
  const env = (process.env.NODE_ENV as EnvironmentKey | undefined) ?? 'development';
  if (env === 'development' || env === 'test' || env === 'production') {
    return env;
  }
  return 'development';
};

export const getDb = (): Knex => {
  if (instance) {
    return instance;
  }

  const environment = resolveEnvironment();
  const config = knexConfig[environment];

  if (!config) {
    throw new Error(`Knex configuration for environment '${environment}' was not found.`);
  }

  instance = knex(config);
  return instance;
};

export const closeDb = async (): Promise<void> => {
  if (!instance) {
    return;
  }

  await instance.destroy();
  instance = null;
};
