"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaInicioF, type SituacaoF } from "./tela-inicio-f";

const SITUACOES: { id: SituacaoF; nome: string; dica: string }[] = [
  { id: "abrindo", nome: "Abrindo", dica: "A barra já vem com o cursor. Setas andam pela lista, o detalhe à direita diz o que o Enter faz. Experimente digitar: 117, aud, criciuma, volume." },
  { id: "codigo", nome: "Digitando uma obra", dica: "“117”: a obra aparece com as ações dela logo abaixo, cada uma dizendo o que usa do que já está guardado." },
  { id: "tarefa", nome: "Digitando uma tarefa", dica: "“aud”: a tarefa de auditoria e as obras e trabalhos que casam." },
  { id: "pedido", nome: "Pedido livre", dica: "Uma frase vira pergunta ao Nexo, em primeiro lugar, e a obra citada é reconhecida." },
  { id: "arquivo", nome: "PDF solto", dica: "O arquivo entra na barra e a lista vira “o que fazer com este arquivo”. Backspace ou Esc tiram o arquivo." },
  { id: "sem-resultado", nome: "Sem resultado", dica: "Nada casa: a barra diz isso e oferece perguntar ao Nexo." },
  { id: "executando", nome: "Executando", dica: "Enter numa ação: a linha diz “começando…” e a esfera trabalha. Esc cancela." },
  { id: "primeiro-acesso", nome: "Primeiro acesso", dica: "Sem histórico: só as tarefas, com os atalhos." },
];

export function VitrineDoInicioF() {
  return <Vitrine telaId="inicio-f" situacoes={SITUACOES} render={(s) => <TelaInicioF key={s} situacao={s} />} />;
}
