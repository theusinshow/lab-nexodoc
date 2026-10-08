/**
 * O RÓTULO DO ACHADO NA BOLHA DA PERGUNTA (07/10/2026): número, nome e a cor
 * da gravidade, no lugar da frase "Sobre o ACH-014 (…)". O texto da mensagem
 * continua o mesmo — ver `lib/pergunta-sobre-achado.ts`.
 */
import { NIVEIS } from "@/lib/nivel-do-achado";
import type { PerguntaSobreAchado } from "@/lib/pergunta-sobre-achado";

import "./rotulo-da-pergunta.css";

export function RotuloDaPergunta({ achado }: { achado: PerguntaSobreAchado }) {
  const nivel = NIVEIS.find((n) => n.id === achado.nivel);
  return (
    <span className={`pa-rotulo pa--${achado.nivel ?? "neutro"}`}>
      <span className="pa-cabeca">
        <i aria-hidden />
        <b>{achado.id}</b>
        {nivel && <span className="pa-nivel">{nivel.nome}</span>}
        {achado.pagina && <span className="pa-pagina">p. {achado.pagina}</span>}
      </span>
      <span className="pa-titulo">{achado.titulo}</span>
    </span>
  );
}
