/**
 * OS E-MAILS DO SUPORTE. Dois destinos: o dev (chamado novo, marco de
 * ocorrências, reaberto, complemento) e quem abriu (resposta ou resolvido).
 *
 * Só monta e entrega pelo [[lib/correio.ts]], que nunca lança: falha de e-mail
 * nunca desfaz o chamado, que já está gravado quando isto roda.
 */
import { enderecoPublico, enviar } from "@/lib/correio";
import { formatarProtocolo, NOME_DO_STATUS, type StatusDoChamado } from "@/lib/suporte/comum";

export type ResumoDoChamado = {
  id: string;
  protocolo: number;
  origem: string;
  categoria: string;
  rota: string;
  ocorrencias: number;
  nome: string | null;
  email: string | null;
};

export type MotivoDoAviso = "novo" | "marco" | "reaberto" | "complemento";

const paraDev = () => process.env.NEXODOC_SUPORTE_PARA?.trim() ?? "";
export const suporteConfigurado = () => Boolean(paraDev());

const ENTIDADES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ENTIDADES[c]);

const TITULO: Record<MotivoDoAviso, (c: ResumoDoChamado) => string> = {
  novo: (c) => (c.origem === "MANUAL" ? `Novo chamado de ${c.nome ?? c.email ?? "alguém"}` : `Erro novo em ${c.rota}`),
  marco: (c) => `Erro repetido ${c.ocorrencias}× em ${c.rota}`,
  reaberto: (c) => `Erro resolvido voltou em ${c.rota}`,
  complemento: (c) => `${c.nome ?? c.email ?? "Alguém"} contou mais sobre o chamado`,
};

function corpo(titulo: string, linhas: string[], link: string, botao: string) {
  const html = `<div style="font:15px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#16181d;max-width:560px">
<p style="margin:0 0 4px;color:#6b7080;font-size:13px">Nexo · suporte</p>
<h1 style="margin:0 0 16px;font-size:18px">${esc(titulo)}</h1>
${linhas.map((l) => `<p style="margin:0 0 8px;white-space:pre-wrap">${esc(l)}</p>`).join("\n")}
${link ? `<p style="margin:20px 0 0"><a href="${esc(link)}" style="display:inline-block;padding:10px 18px;background:#0a0b0d;color:#f2f3f5;text-decoration:none;border-radius:999px">${esc(botao)} &rarr;</a></p>` : ""}
</div>`;
  const texto = [titulo, "", ...linhas, "", link ? `${botao}: ${link}` : ""].join("\n");
  return { html, texto };
}

export async function avisarDev(c: ResumoDoChamado, motivo: MotivoDoAviso, texto?: string) {
  const para = paraDev();
  if (!para) return;
  const titulo = `${formatarProtocolo(c.protocolo)} · ${TITULO[motivo](c)}`;
  const base = enderecoPublico();
  const linhas = [
    `Origem: ${c.origem} · Categoria: ${c.categoria} · Ocorrências: ${c.ocorrencias}`,
    `Rota: ${c.rota}`,
    ...(c.email ? [`Quem: ${c.nome ?? ""} <${c.email}>`] : []),
    ...(texto ? ["", texto.slice(0, 2000)] : []),
  ];
  const r = await enviar({ para, assunto: `[Nexo] ${titulo}`, ...corpo(titulo, linhas, base ? `${base}/admin/suporte?c=${c.id}` : "", "Abrir no admin") });
  if (r.estado === "falhou") console.error(`[suporte] e-mail ao dev falhou (${formatarProtocolo(c.protocolo)}): ${r.erro}`);
}

export async function avisarAutor(para: string, c: { protocolo: number; status: StatusDoChamado }, texto: string | null) {
  const titulo =
    c.status === "RESOLVIDO" ? `Seu chamado ${formatarProtocolo(c.protocolo)} foi resolvido` : `Resposta no seu chamado ${formatarProtocolo(c.protocolo)}`;
  const base = enderecoPublico();
  const linhas = [...(texto ? [texto.slice(0, 4000)] : []), `Situação: ${NOME_DO_STATUS[c.status]}`];
  const r = await enviar({ para, assunto: titulo, ...corpo(titulo, linhas, base ? `${base}/ajuda#chamados` : "", "Ver meus chamados") });
  if (r.estado === "falhou") console.error(`[suporte] e-mail ao autor falhou (${formatarProtocolo(c.protocolo)}): ${r.erro}`);
}
