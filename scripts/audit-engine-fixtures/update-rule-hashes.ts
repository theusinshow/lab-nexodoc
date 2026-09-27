/**
 * Atualiza `rule-source-hashes.json` depois de subir a versão em
 * `RULE_MODULE_VERSIONS` (lib/audit-engine/version.ts). Recusa gravar hash novo
 * com a versão antiga: mudança material de regra precisa invalidar cache.
 *
 *   node --import ./scripts/lib/resolver-de-imports.mjs scripts/audit-engine-fixtures/update-rule-hashes.ts
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { RULE_MODULE_VERSIONS } from "../../lib/audit-engine/version.ts";

const path = "scripts/audit-engine-fixtures/rule-source-hashes.json";
const registry = JSON.parse(readFileSync(path, "utf8")) as Record<string, { version: string; sha256: string }>;
const refused: string[] = [];
const next: typeof registry = {};
for (const [mod, version] of Object.entries(RULE_MODULE_VERSIONS)) {
  const sha256 = createHash("sha256").update(readFileSync(`lib/audit-engine/${mod}.ts`, "utf8").replace(/\r\n/g, "\n")).digest("hex");
  const old = registry[mod];
  if (old && old.sha256 !== sha256 && old.version === version) refused.push(mod);
  next[mod] = { version, sha256 };
}
if (refused.length) {
  console.error(`Suba a versão antes de registrar: ${refused.join(", ")}`);
  process.exitCode = 1;
} else {
  writeFileSync(path, JSON.stringify(next, null, 2) + "\n");
  console.log("rule-source-hashes.json atualizado.");
}
