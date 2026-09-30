"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaResultado, type SituacaoRes } from "./tela-resultado";

const SITUACOES: { id: SituacaoRes; nome: string; dica: string }[] = [
  { id: "nao-emitir", nome: "Não emitir", dica: "Versão D, enxuta: a cor segue o agrupamento (por impacto, só o nível tem cor; a disciplina vira sigla cinza). A linha mostra título, disciplina e dono. O porquê do veredito virou uma linha sob o título; o que foi lido é a dica do selo. À direita, um card só: Disciplinas ou Páginas." },
  { id: "revisar", nome: "Revisar antes", dica: "Revisão B, sem bloqueios: sobram decisões técnicas. O losango para na faixa âmbar." },
  { id: "liberado", nome: "Com ressalvas", dica: "Só revisão de texto: liberado, e a tela diz o escopo do que foi lido." },
  { id: "parcial", nome: "Análise parcial", dica: "Três blocos não foram lidos: não vale como liberação, o mapa mostra as páginas não lidas e Auditar de novo aparece." },
  { id: "comparado", nome: "Comparada", dica: "Segunda auditoria da obra: a linha do que mudou desde a anterior." },
  { id: "abrindo", nome: "Abrindo", dica: "Buscando o parecer no servidor: o esqueleto tem a forma do que vem." },
  { id: "nao-abriu", nome: "Não abriu", dica: "Parecer não encontrado: diz o porquê provável e por onde seguir." },
  { id: "memorial", nome: "Ver no memorial", dica: "O memorial original num visor por cima da tela, na página do achado: o trecho grifado na cor do nível, o número na margem, os outros achados da página ao lado e as páginas com achado embaixo. J e K pulam entre elas, ← → folheia, Esc fecha." },
  { id: "fila", nome: "Fila", dica: "J e K andam, C marca corrigido, D abre a decisão, F é falso positivo, / busca. Corrigir mostra Desfazer (Z) por 6 segundos." },
  { id: "filtros", nome: "Filtros", dica: "Os filtros de hoje: responsável, ordem, gravidade, disciplina (na ordem de frequência, cada uma com a sua cor) e tipo. O botão Filtros mostra quantos estão ligados; Limpar filtros zera." },
  { id: "por-disciplina", nome: "Por disciplina", dica: "Agrupar por disciplina: cada grupo com a cor dela, e o ponto redondo de cada linha passa a dizer o nível. Na aba Resumo, o card Por disciplina abre a fila já filtrada." },
  { id: "decisao", nome: "Decisão técnica", dica: "O motivo é escrito ali mesmo, sem janela por cima. Esc cancela." },
  { id: "selecionando", nome: "Selecionando", dica: "Marcou achados: a barra de atribuir sobe de baixo. Esc limpa." },
  { id: "vazio-filtro", nome: "Busca vazia", dica: "Nada casa com a busca: diz onde ela procura e oferece limpar." },
  { id: "encerrado", nome: "Encerrado", dica: "Decisão técnica registrada por Carla: quem, quando e o motivo, e Reabrir." },
];

export function VitrineDoResultadoD() {
  return <Vitrine telaId="resultado-d" situacoes={SITUACOES} render={(s) => <TelaResultado key={s} situacao={s} />} />;
}
