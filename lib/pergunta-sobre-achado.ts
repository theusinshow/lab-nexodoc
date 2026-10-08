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
export function textoDaPergunta(achado: { id: string; titulo: string; nivel: Nivel }, pagina: number | null, pergunta: string): string {
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
