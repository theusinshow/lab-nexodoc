import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUserAccess } from "@/lib/access-control";

/**
 * O REGISTRO DAS DECISÕES do /lab. Cada item aprovado, recusado ou com pedido
 * de mudança vira uma linha em `design-lab/aprovacoes.json`, versionado junto
 * com o código: a decisão sobrevive à sessão, aparece no histórico do git e é
 * lida por quem for implementar a tela.
 *
 * GRAVAR SÓ EM DEV. Em produção o sistema de arquivos é efêmero e o lab é só
 * leitura para admin; um POST lá "funcionaria" e sumiria no próximo deploy,
 * que é pior do que recusar.
 */

const ARQUIVO = path.join(process.cwd(), "design-lab", "aprovacoes.json");
const STATUS = new Set(["pendente", "aprovado", "mudar"]);

type Registro = Record<string, { status: string; nota: string; em: string }>;

async function ler(): Promise<Registro> {
  try {
    return JSON.parse(await fs.readFile(ARQUIVO, "utf8")) as Registro;
  } catch {
    return {};
  }
}

async function podeVer() {
  if (process.env.NODE_ENV !== "production") return true;
  const session = await auth();
  if (!session?.user) return false;
  const access = await getUserAccess(session.user.email, session.user.name);
  return access.isActive && access.isAdmin;
}

export async function GET() {
  if (!(await podeVer())) return NextResponse.json({ erro: "sem acesso" }, { status: 404 });
  return NextResponse.json(await ler());
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ erro: "O registro do lab só grava em desenvolvimento." }, { status: 405 });
  }
  const corpo = (await req.json().catch(() => null)) as { id?: string; status?: string; nota?: string } | null;
  if (!corpo?.id || !corpo.status || !STATUS.has(corpo.status)) {
    return NextResponse.json({ erro: "Informe id e status (pendente, aprovado ou mudar)." }, { status: 400 });
  }
  const registro = await ler();
  registro[corpo.id] = { status: corpo.status, nota: (corpo.nota ?? "").slice(0, 2000), em: new Date().toISOString() };
  // Chaves ordenadas: o diff do git mostra só o item que mudou.
  const ordenado = Object.fromEntries(Object.entries(registro).sort(([a], [b]) => a.localeCompare(b)));
  await fs.mkdir(path.dirname(ARQUIVO), { recursive: true });
  await fs.writeFile(ARQUIVO, JSON.stringify(ordenado, null, 2) + "\n", "utf8");
  return NextResponse.json(registro[corpo.id]);
}
