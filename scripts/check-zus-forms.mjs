import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forms = JSON.parse(readFileSync(path.join(root, "shared/zus-form-layouts.json"), "utf8"));
const sources = JSON.parse(readFileSync(path.join(root, "shared/zus-form-sources.json"), "utf8"));
const corrections = JSON.parse(readFileSync(path.join(root, "shared/zus-form-label-corrections.json"), "utf8"));
const periodBindings = JSON.parse(readFileSync(path.join(root, "shared/zus-form-period-bindings.json"), "utf8"));
const sha = (asset) => createHash("sha256").update(readFileSync(path.join(root, "frontend/public", asset))).digest("hex");
let count = 0;
for (const form of forms) {
  const source = sources.find((source) => source.id === form.id);
  if (!source || source.url !== form.url || new URL(form.url).hostname !== "www.zus.pl") throw new Error(`Unverified form ${form.id}`);
  if (!form.pdf.startsWith(`/forms/${form.id}/`) || sha(form.pdf) !== form.sha256) throw new Error(`Form PDF changed: ${form.id}`);
  const ids = new Set();
  const correction = corrections[form.id];
  if (correction && correction.sha256 !== form.sha256) throw new Error(`Label corrections need review: ${form.id}`);
  for (const page of form.pages) {
    if (!page.image.startsWith(`/forms/${form.id}/`) || sha(page.image) !== page.imageSha256) throw new Error(`Page changed: ${form.id}/${page.number}`);
    for (const field of page.fields) {
      if (ids.has(field.id) || !field.label || field.rect.length !== 4 || field.rect.some((v) => !Number.isFinite(v) || v < 0 || v > 100)
        || field.rect[0] + field.rect[2] > 100.01 || field.rect[1] + field.rect[3] > 100.01) throw new Error(`Invalid locator: ${form.id}/${field.id}`);
      ids.add(field.id); count++;
      const reviewed = correction?.fields[field.id];
      if (reviewed && (field.label !== reviewed.label || field.name !== reviewed.name || !field.reviewed)) throw new Error(`Missing label correction: ${form.id}/${field.id}`);
    }
  }
  if (correction && Object.keys(correction.fields).some((id) => !ids.has(id))) throw new Error(`Unmatched corrected field: ${form.id}`);
  for (const { name, phrase } of Object.values(periodBindings[form.id] ?? {})) {
    const fields = form.pages.flatMap((page) => page.fields).filter((field) => field.name === name);
    if (fields.length !== 1 || fields[0].type !== "Text" || !fields[0].label.includes(phrase)) throw new Error(`Review plan-period binding: ${form.id}/${name}`);
  }
}
if (forms.length !== sources.length) throw new Error("Missing form layouts");
console.log(`Verified ${forms.length} public ZUS PDFs, page hashes and ${count} exact PDF fields.`);
