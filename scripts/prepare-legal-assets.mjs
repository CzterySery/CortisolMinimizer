// Export only the six public reference documents listed in the source manifest.
// Restricted sample cases are never enumerated or copied.
import { readFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(root, "Documents/legal/manifest.json"), "utf8"));
const output = path.join(root, "frontend/public/legal");
await mkdir(output, { recursive: true });
for (const item of manifest) {
  if (!/^[a-z-]+$/.test(item.id) || !item.source_file.startsWith("Documents/Materiały") || !item.markdown.startsWith("Documents/legal/") || item.source_file.split("/").includes("..")) {
    throw new Error("Unexpected public legal source in manifest");
  }
  const bytes = await readFile(path.join(root, item.source_file));
  if (createHash("sha256").update(bytes).digest("hex") !== item.sha256) throw new Error(`Legal source changed: ${item.id}`);
  await copyFile(path.join(root, item.source_file), path.join(output, item.id + path.extname(item.source_file)));
  await copyFile(path.join(root, item.markdown), path.join(output, `${item.id}.md`));
}
console.log(`Prepared ${manifest.length} public legal documents.`);
