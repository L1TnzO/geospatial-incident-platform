import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

const serverRoot = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(serverRoot, "..");

const envSearchOrder: string[] = [path.resolve(serverRoot, ".env")];

if (process.env.NODE_ENV) {
  envSearchOrder.push(
    path.resolve(serverRoot, `.env.${process.env.NODE_ENV}`)
  );
}

envSearchOrder.push(
  path.resolve(serverRoot, "config/.env"),
  path.resolve(serverRoot, "config/.env.local"),
  path.resolve(serverRoot, "config/.env.example"),
  path.resolve(repoRoot, "infra/docker/.env.backend"),
  path.resolve(repoRoot, "infra/docker/.env.backend.example")
);

for (const file of envSearchOrder) {
  if (file.trim().endsWith(".")) {
    continue;
  }

  if (fs.existsSync(file)) {
    loadEnv({ path: file, override: false });
  }
}

const parsePort = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const SERVICE_NAME_FALLBACK = "geospatial-incident-backend";
const VERSION_FALLBACK = "0.0.0";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT, 4000),
  serviceName: process.env.SERVICE_NAME ?? SERVICE_NAME_FALLBACK,
  version:
    process.env.BUILD_VERSION ??
    process.env.npm_package_version ??
    VERSION_FALLBACK,
};

export const appMetadata = {
  name: env.serviceName,
  version: env.version,
};
