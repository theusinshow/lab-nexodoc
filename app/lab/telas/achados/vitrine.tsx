"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaAchados, type SituacaoAchados } from "./tela-achados";

export const SITUACOES: { id: SituacaoAchados; nome: string; dica: string }[] = [
  { id: "com-voce", nome: "Com você", dica: "Os pareceres com achados seus, com os níveis contados (ponto redondo = nível). À direita, o resumo por nível. Filtre por nível nas abas; ↑ ↓ andam." },
  { id: "parecer-escolhido", nome: "Parecer escolhido", dica: "O memorial geral da 117-25 escolhido: os 3 achados que esperam nele, com disciplina e página, antes de abrir. Enter abre o parecer no Nexo." },
  { id: "que-voce-passou", nome: "Que você passou", dica: "O outro tile: o que você passou a alguém, por pessoa. O que espera há 7 dias ou mais fica em âmbar." },
  { id: "so-passados", nome: "Nada com você", dica: "Nada está com você: o tile diz isso, e a tela abre no que você passou." },
  { id: "nada", nome: "Nada em aberto", dica: "Nem com você, nem com os outros: o painel diz isso e oferece Nova auditoria." },
];

export function VitrineDeAchados() {
  return <Vitrine telaId="achados" situacoes={SITUACOES} render={(s) => <TelaAchados key={s} situacao={s} />} />;
}
