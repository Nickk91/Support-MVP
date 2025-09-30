// server/src/routes/uploads.test.js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import fs from "node:fs/promises";
import path from "node:path";

const TMP = path.resolve(".tmp-test-uploads");

async function rimraf(p) {
  await fs.rm(p, { recursive: true, force: true });
}

describe("POST /api/uploads/files", () => {
  let app;

  beforeAll(async () => {
    // set env **before** importing the route
    process.env.UPLOAD_DIR = TMP;

    await rimraf(TMP);
    await fs.mkdir(TMP, { recursive: true });

    // 🔑 dynamic import ensures uploads.js reads the updated env
    const uploadsRoutes = (await import("./uploads.js")).default;

    app = express();
    app.use("/api/uploads", uploadsRoutes);
  });

  afterAll(async () => {
    await rimraf(TMP);
  });

  it("accepts a small text file and returns metadata", async () => {
    const buf = Buffer.from("hello ragmate\n", "utf8");

    const res = await request(app)
      .post("/api/uploads/files")
      .attach("files", buf, {
        filename: "sample.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.files)).toBe(true);
    expect(res.body.files.length).toBe(1);

    const f = res.body.files[0];
    expect(f.filename).toBe("sample.txt");
    expect(f.size).toBe(buf.length);
    expect(typeof f.storedAs).toBe("string");
    expect(typeof f.mimetype).toBe("string");

    // File should exist in TMP
    const exists = await fs
      .access(path.join(TMP, f.storedAs))
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });
});
