import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "node_modules", ".vite");
try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}
