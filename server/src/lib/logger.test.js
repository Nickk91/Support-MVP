// server/src/lib/logger.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import morgan from "morgan";
import { errorLogger } from "./logger.js";

// helper: app with morgan using custom stream
function makeAppWithMorgan(stream) {
  const app = express();
  app.use(morgan("combined", { stream })); // ✅ correct usage for capturing output
  app.get("/ok", (req, res) => res.json({ ok: true }));
  app.get("/boom", (req, res, next) => next(new Error("kapow")));
  // error logger + tiny error handler
  app.use(errorLogger);
  app.use((err, req, res, next) => {
    res
      .status(500)
      .json({ ok: false, error: "server_error", message: err.message });
  });
  return app;
}

describe("logger", () => {
  let logs;

  beforeEach(() => {
    logs = [];
  });

  it("logs a request line for /ok via morgan", async () => {
    const stream = { write: (str) => logs.push(str) };
    const app = makeAppWithMorgan(stream);

    const res = await request(app).get("/ok");
    expect(res.status).toBe(200);

    const anyLine = logs.join("");
    expect(anyLine).toContain("GET /ok"); // morgan wrote a line that mentions /ok
  });

  it("errorLogger prints stack traces to console.error", async () => {
    const stream = { write: () => {} }; // ignore request log noise
    const app = makeAppWithMorgan(stream);

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ ok: false, error: "server_error" });

    // errorLogger should have printed the error (includes our message)
    expect(spy).toHaveBeenCalled();
    const joined = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(joined).toContain("kapow");
    spy.mockRestore();
  });
});
