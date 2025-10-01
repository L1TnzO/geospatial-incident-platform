import { Router } from "express";
import { appMetadata } from "../config/env";

const router = Router();

router.get("/healthz", (_req, res) => {
  const uptimeSeconds = process.uptime();
  const timestamp = new Date().toISOString();

  res.json({
    status: "ok",
    service: appMetadata.name,
    version: appMetadata.version,
    uptimeSeconds,
    timestamp,
  });
});

export default router;
