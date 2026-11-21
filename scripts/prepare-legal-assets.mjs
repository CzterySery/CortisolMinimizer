// Export only the six public reference documents listed in the source manifest.
// Restricted sample cases are never enumerated or copied.
import { readFile, readdir, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(root, "Documents/legal/manifest.json"), "utf8"));
const output = path.join(root, "frontend/public/legal");

// Polish file names can be stored composed (NFC) or decomposed (NFD) depending on the checkout. macOS matches
// either; Linux (Docker) compares bytes. Find each path segment by its normalized name instead of guessing.
async function resolve(relative) {
  let current = root;
  for (const part of relative.split("/")) {
    const match = (await readdir(current)).find((name) => name.normalize("NFC") === part.normalize("NFC"));
    if (!match) throw new Error(`Missing public legal source: ${relative}`);
    current = path.join(current, match);
  }
  return current;
}
await mkdir(output, { recursive: true });
for (const item of manifest) {
  if (!/^[a-z-]+$/.test(item.id) || !item.source_file.startsWith("Documents/Materiały") || !item.markdown.startsWith("Documents/legal/") || item.source_file.split("/").includes("..")) {
    throw new Error("Unexpected public legal source in manifest");
  }
  const source = await resolve(item.source_file);
  const bytes = await readFile(source);
  if (createHash("sha256").update(bytes).digest("hex") !== item.sha256) throw new Error(`Legal source changed: ${item.id}`);
  await copyFile(source, path.join(output, item.id + path.extname(item.source_file)));
  await copyFile(path.join(root, item.markdown), path.join(output, `${item.id}.md`));
}
console.log(`Prepared ${manifest.length} public legal documents.`);
