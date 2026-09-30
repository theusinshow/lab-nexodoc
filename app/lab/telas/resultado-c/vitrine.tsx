"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaResultado, type SituacaoRes } from "./tela-resultado";

const SITUACOES: { id: SituacaoRes; nome: string; dica: string }[] = [
  { id: "nao-emitir", nome: "Não emitir", dica: "Versão C: o resumo é a lista do que falta, em ordem de impacto. Passe o mouse numa linha: o ✓ marca corrigido ali mesmo, a linha desce para Tratados e o anel lá em cima sobe. Veredito, onde e o que foi lido ficam na coluna estreita." },
  { id: "revisar", nome: "Revisar antes", dica: "Revisão B, sem bloqueios: sobram decisões técnicas. O losango para na faixa âmbar." },
  { id: "liberado", nome: "Com ressalvas", dica: "Só revisão de texto: liberado, e a tela diz o escopo do que foi lido." },
  { id: "parcial", nome: "Análise parcial", dica: "Três blocos não foram lidos: não vale como liberação, o mapa mostra as páginas não lidas e Auditar de novo aparece." },
  { id: "comparado", nome: "Comparada", dica: "Segunda auditoria da obra: a linha do que mudou desde a anterior." },
  { id: "abrindo", nome: "Abrindo", dica: "Buscando o parecer no servidor: o esqueleto tem a forma do que vem." },
  { id: "nao-abriu", nome: "Não abriu", dica: "Parecer não encontrado: diz o porquê provável e por onde seguir." },
  { id: "fila", nome: "Fila", dica: "J e K andam, C marca corrigido, D abre a decisão, F é falso positivo, / busca. Corrigir mostra Desfazer (Z) por 6 segundos." },
  { id: "decisao", nome: "Decisão técnica", dica: "O motivo é escrito ali mesmo, sem janela por cima. Esc cancela." },
  { id: "selecionando", nome: "Selecionando", dica: "Marcou achados: a barra de atribuir sobe de baixo. Esc limpa." },
  { id: "vazio-filtro", nome: "Busca vazia", dica: "Nada casa com a busca: diz onde ela procura e oferece limpar." },
  { id: "encerrado", nome: "Encerrado", dica: "Decisão técnica registrada por Carla: quem, quando e o motivo, e Reabrir." },
];

export function VitrineDoResultadoC() {
  return <Vitrine telaId="resultado-c" situacoes={SITUACOES} render={(s) => <TelaResultado key={s} situacao={s} />} />;
}
