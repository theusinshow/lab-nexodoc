// Servidor de dev ISOLADO para a execução UX/UI: banco da bateria (nexodoc_teste),
// IA simulada, sem e-mail, pasta .next-ux, porta 3200.
import { spawn } from "node:child_process";
import { ambienteDoServidor } from "../bateria/lib/ambiente.mjs";
const PORTA = 3200;
const env = { ...ambienteDoServidor(PORTA), NEXODOC_DIST_DIR: ".next-ux", NEXODOC_DEV_AUTH_EMAIL: "ux@nexodoc.local", NEXODOC_DEV_AUTH_NAME: "UX Teste", NEXODOC_ADMIN_TOKEN: "ux-token-teste" };
const p = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-H", "127.0.0.1", "-p", String(PORTA)], { env, stdio: "inherit" });
p.on("exit", (c) => process.exit(c ?? 0));
