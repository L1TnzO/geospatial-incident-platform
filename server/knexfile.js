const fs = require('node:fs');
const path = require('node:path');
const { config: loadEnv } = require('dotenv');

const serverRoot = __dirname;
const repoRoot = path.resolve(serverRoot, '..');

const envSearchOrder = [path.resolve(serverRoot, '.env')];

if (process.env.NODE_ENV) {
  envSearchOrder.push(path.resolve(serverRoot, `.env.${process.env.NODE_ENV}`));
}

envSearchOrder.push(
  path.resolve(serverRoot, 'config/.env'),
  path.resolve(serverRoot, 'config/.env.local'),
  path.resolve(serverRoot, 'config/.env.example'),
  path.resolve(repoRoot, 'infra/docker/.env.backend'),
  path.resolve(repoRoot, 'infra/docker/.env.backend.example')
);

envSearchOrder.forEach((filePath) => {
  if (!filePath || filePath.endsWith('.')) {
    return;
  }

  if (fs.existsSync(filePath)) {
    loadEnv({ path: filePath, override: false });
  }
});

const buildConnectionConfig = () => {
  if (
    process.env.DATABASE_HOST &&
    process.env.DATABASE_PORT &&
    process.env.DATABASE_USER &&
    process.env.DATABASE_PASSWORD &&
    process.env.DATABASE_NAME
  ) {
    return {
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: getSslConfig(),
    };
  }

  const connectionString =
    process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5434/postgres';

  return {
    connectionString,
    ssl: getSslConfig() ?? true,
  };
};

const getSslConfig = () => {
  const sslSetting = process.env.DATABASE_SSL;
  if (!sslSetting || sslSetting === 'false') {
    return undefined; // No SSL by default if not set or false
  }

  return sslSetting === 'true' || sslSetting === 'require'
    ? { rejectUnauthorized: false }
    : sslSetting === 'no-verify'
      ? { rejectUnauthorized: false }
      : sslSetting === 'ca'
        ? { ca: process.env.DATABASE_SSL_CA }
        : { rejectUnauthorized: false }; // Default fallback for enabled SSL
};

const baseConfig = {
  client: 'pg',
  connection: buildConnectionConfig(),
  migrations: {
    directory: path.resolve(serverRoot, 'db/migrations'),
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: path.resolve(serverRoot, 'db/seeds'),
  },
};

module.exports = {
  development: { ...baseConfig },
  test: { ...baseConfig },
  production: { ...baseConfig },
};
