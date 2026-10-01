"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaVolumes, type SituacaoVolumes } from "./tela-volumes";

const SITUACOES: { id: SituacaoVolumes; nome: string; dica: string }[] = [
  { id: "vazio", nome: "Nada importado", dica: "Primeira vez: a biblioteca é só o lugar de importar; a montagem diz como o volume nasce; a conferência espera." },
  { id: "montando", nome: "Montando", dica: "Volume 01 com dois grupos, cada linha com as páginas do PDF que ocupa. A fila mostra o que está entrando (lendo, duplicado, recusado). Estrutural sem LD aparece em âmbar e na conferência." },
  { id: "selecao", nome: "Páginas escolhidas", dica: "3 páginas do LD escolhidas na biblioteca: o destino acende (Volume 01 › Estrutural, como LD) e a linha vazia de LD fica marcada. Enter adiciona." },
  { id: "conferencia", nome: "Conferida", dica: "Esta versão foi conferida: o Gerar PDF vira primário. O aviso de LD continua, mas não impede exportar." },
  { id: "previa", nome: "Prévia aberta", dica: "O volume na ordem, peça a peça, com os mesmos papéis e carimbos do Mapa. ← → andam, Esc fecha." },
  { id: "exportando", nome: "Exportando", dica: "Gerar PDF juntando as 26 páginas: a barra anda no lugar do botão." },
  { id: "falha-gravacao", nome: "Falha de gravação", dica: "O rascunho não salvou (armazenamento cheio): a barra diz isso com a frase do app e oferece tentar de novo." },
  { id: "recuperado", nome: "Recuperado após recarregar", dica: "A página recarregou e a montagem voltou do rascunho deste dispositivo: uma linha diz isso e oferece começar do zero." },
];

export function VitrineDeVolumes() {
  return <Vitrine telaId="volumes" situacoes={SITUACOES} render={(s) => <TelaVolumes key={s} situacao={s} />} />;
}
