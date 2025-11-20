import http from "node:http";
import { env } from "./config/env";
import { createApp } from "./app";

const app = createApp();

const server = http.createServer(app);

server.listen(env.port, '0.0.0.0', () => {
  console.log(
    `[server] Listening on port ${env.port} (${env.nodeEnv}) — service ${env.serviceName} v${env.version}`
  );
});

process.on("SIGTERM", () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  server.close(() => {
    process.exit(0);
  });
});
