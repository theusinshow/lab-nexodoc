import { spawnSync } from "node:child_process";
import { ambienteDosTestes } from "../bateria/lib/ambiente.mjs";
const env = { ...ambienteDosTestes(), NEXODOC_DEV_AUTH_EMAIL: "ux@nexodoc.local", NEXODOC_DEV_AUTH_NAME: "UX Teste" };
const r = spawnSync(process.execPath, ["scripts/seed-desenvolvimento.ts"], { env, encoding: "utf8" });
console.log(r.stdout, r.stderr.split("\n").filter(l=>!/Warning|trace-warnings|Reparsing|eliminate/.test(l)).join("\n"));
process.exit(r.status ?? 1);
