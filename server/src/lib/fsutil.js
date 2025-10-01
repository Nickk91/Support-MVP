// server/src/lib/fsutil.js
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Ensures the upload directory exists and returns its absolute path.
 */
export async function ensureUploadDir(dir) {
  const abs = path.resolve(process.cwd(), dir);
  await fs.mkdir(abs, { recursive: true });
  return abs;
}
