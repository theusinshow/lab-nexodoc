"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaResultado, type SituacaoRes } from "./tela-resultado";

const SITUACOES: { id: SituacaoRes; nome: string; dica: string }[] = [
  { id: "nao-emitir", nome: "Não emitir", dica: "O veredito como posição numa faixa, o tratamento como uma pílula por achado (passe o mouse, clique para abrir). A abre a fila." },
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

export function VitrineDoResultado() {
  return <Vitrine telaId="resultado-v1" situacoes={SITUACOES} render={(s) => <TelaResultado key={s} situacao={s} />} />;
}
