/**
 * A PERGUNTA SOBRE UM ACHADO, como texto e como rótulo — 07/10/2026.
 *
 * A pergunta feita no visor vai pela MESMA conversa do Nexo, como texto (é o
 * que o modelo lê e o que o histórico guarda). Na bolha, ela aparecia como uma
 * frase crua — "Sobre o ACH-014 (“…”, p. 3): …" — e o achado se perdia no meio
 * do texto. Agora o texto leva também a gravidade, e a bolha o lê de volta para
 * desenhar o rótulo inteiro: número, nome e a cor da gravidade.
 *
 * O texto é a fonte da verdade, e não um campo à parte na mensagem: a conversa
 * recarregada do histórico só tem o texto, e o rótulo precisa voltar com ela.
 * A forma antiga (sem gravidade) continua sendo lida, com o rótulo neutro.
 *
 * Puro, sem `@/`.
 */
import { NIVEIS, type Nivel } from "./nivel-do-achado.ts";

export interface PerguntaSobreAchado {
  id: string;
  titulo: string;
  nivel: Nivel | null;
  pagina: number | null;
  pergunta: string;
}

/** O texto que vai para a conversa. */
export function textoDaPergunta(achado: { id: string; titulo: string; nivel: Nivel | null }, pagina: number | null, pergunta: string): string {
  const nome = NIVEIS.find((n) => n.id === achado.nivel)?.nome;
  const onde = pagina ? `, p. ${pagina}` : "";
  return `Sobre o ${achado.id}${nome ? ` · ${nome}` : ""} (“${achado.titulo}”${onde}): ${pergunta}`;
}

const FORMA = /^Sobre o ((?:ACH|INC)-\d{1,4})(?: · ([^(“]+?))? \(“([\s\S]*?)”(?:, p\. (\d{1,4}))?\): ([\s\S]+)$/;

/** O texto de volta em partes; `null` quando não é uma pergunta sobre achado. */
export function lerPerguntaSobreAchado(texto: string): PerguntaSobreAchado | null {
  const m = FORMA.exec(texto.trim());
  if (!m) return null;
  const nivel = m[2] ? (NIVEIS.find((n) => n.nome === m[2].trim())?.id ?? null) : null;
  return {
    id: m[1].replace(/^INC-/, "ACH-"),
    titulo: m[3],
    nivel,
    pagina: m[4] ? Number(m[4]) : null,
    pergunta: m[5].trim(),
  };
}

/*
 * O ACHADO ARRASTADO PARA O CHAT (08/10/2026). A linha da fila leva o achado
 * num tipo próprio do `dataTransfer`; o chat o prende acima do campo e, no
 * envio, a pergunta sai por `textoDaPergunta` — o mesmo texto do visor, então
 * a bolha e o histórico não precisam saber de onde ela veio.
 *
 * Tipo próprio, e não "Files": o overlay de "solte os PDFs" do workspace só
 * acende com "Files", e um achado arrastado não pode acendê-lo.
 */
export const TIPO_DO_ACHADO_ARRASTADO = "application/x-nexodoc-achado";

export type AchadoArrastado = Omit<PerguntaSobreAchado, "pergunta">;

export function arrastarAchado(dt: DataTransfer, achado: { id: string; titulo: string; nivel: Nivel; pagina: string | number | null }): void {
  const pagina = Number.parseInt(String(achado.pagina ?? ""), 10);
  const carga: AchadoArrastado = { id: achado.id, titulo: achado.titulo, nivel: achado.nivel, pagina: Number.isFinite(pagina) && pagina > 0 ? pagina : null };
  dt.effectAllowed = "copy";
  dt.setData(TIPO_DO_ACHADO_ARRASTADO, JSON.stringify(carga));
  // Solto fora do chat (num editor, num e-mail), vira o número e o título.
  dt.setData("text/plain", `${achado.id} — ${achado.titulo}`);
}

/** Só olha o tipo: durante o arrasto o navegador esconde o conteúdo. */
export function temAchadoArrastado(dt: DataTransfer | null): boolean {
  return Boolean(dt && Array.from(dt.types).includes(TIPO_DO_ACHADO_ARRASTADO));
}

export function lerAchadoArrastado(dt: DataTransfer | null): AchadoArrastado | null {
  const bruto = dt?.getData(TIPO_DO_ACHADO_ARRASTADO);
  if (!bruto) return null;
  try {
    const c = JSON.parse(bruto) as Partial<AchadoArrastado>;
    if (typeof c.id !== "string" || typeof c.titulo !== "string") return null;
    const nivel = NIVEIS.some((n) => n.id === c.nivel) ? (c.nivel as Nivel) : null;
    return { id: c.id, titulo: c.titulo, nivel, pagina: typeof c.pagina === "number" ? c.pagina : null };
  } catch {
    return null;
  }
}
