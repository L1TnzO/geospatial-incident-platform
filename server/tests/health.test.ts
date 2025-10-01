import request from "supertest";
import { createApp } from "../src/app";
import { appMetadata } from "../src/config/env";

type HealthResponse = {
  status: string;
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
};

describe("GET /healthz", () => {
  it("returns service metadata", async () => {
    const response = await request(createApp())
      .get("/healthz")
      .expect("Content-Type", /json/);

    expect(response.status).toBe(200);

    const body = response.body as HealthResponse;

    expect(body).toEqual(
      expect.objectContaining({
        status: "ok",
        service: appMetadata.name,
        version: appMetadata.version,
      })
    );
    expect(typeof body.uptimeSeconds).toBe("number");
    expect(() => new Date(body.timestamp)).not.toThrow();
  });
});
