"use client";

/**
 * ABRIR UMA AUDITORIA POR LINK — `/nexo?auditoria=<id>`.
 *
 * É o que a home promete quando alguém clica em ABRIR numa pendência. Sem isto,
 * o link levava ao Nexo genérico e a pessoa tinha que procurar sozinha a
 * auditoria em que os achados dela estavam.
 *
 * POR QUE NÃO BASTA PROCURAR NO INDEXEDDB
 *
 * As conversas moram no navegador de quem as criou. O Milton, recebendo achados
 * do Victor, NÃO tem a conversa do Victor na máquina dele — e é justamente esse
 * o caso que a fila existe para atender. Então o parecer vem do servidor, pelo
 * mesmo caminho que a reconexão já usa (`consultarAuditoria`), e vira artefato
 * numa conversa nova.
 *
 * O parecer entra na conversa ATUAL — que, para quem chega por link, é uma
 * conversa nova recém-criada pelo store. Tentar criar outra antes de salvar
 * introduzia uma corrida: a troca de conversa é estado, e a gravação seguinte
 * ainda via o id antigo.
 *
 * Se a auditoria já estiver aberta, não faz nada — recarregar a página não deve
 * duplicar o artefato nem trocar de conversa por baixo de quem estava lendo.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { lerLinkDoAchado } from "@/lib/link-do-achado";

import { consultarAuditoria } from "../lib/audit";
import { useConversation } from "../state/conversation-store";
import { detalheDoParecer, resumoDoParecer } from "@/lib/auditoria-incompleta";

/**
 * O TIPO da falha, e não só a frase — auditoria UX/UI, A01. O shell decide a
 * saída por ele: sessão leva ao login com o mesmo destino; temporária e rede
 * oferecem "Tentar de novo"; não encontrada e sem acesso oferecem voltar.
 */
export type FalhaDoLink =
  | "nao-encontrada"
  | "sem-acesso"
  | "sem-sessao"
  | "rodando"
  | "temporaria"
  | "falhou"
  | "rede";

export type AberturaPorLink = {
  /** Há uma auditoria pedida pela URL (mesmo que já tenha falhado). */
  pedida: boolean;
  /** Enquanto busca o parecer no servidor. */
  carregando: boolean;
  /** Por que não deu. */
  falha: string | null;
  tipoDaFalha: FalhaDoLink | null;
  /** Repete a consulta — para falha temporária, de rede ou ainda rodando. */
  tentarDeNovo: () => void;
  /** O parecer está aqui e pode ser mostrado. */
  abriu: boolean;
  /** O achado que o link pediu, ou nulo. */
  achadoEmFoco: string | null;
};

export function useAbrirAuditoriaPorLink(params: {
  auditoria: string | null;
  achado: string | null;
}): AberturaPorLink {
  /*
   * OS DOIS PARÂMETROS, lidos pela MESMA regra que monta o link no e-mail
   * ([[lib/link-do-achado.ts]]). Achado sem auditoria é descartado: focar um
   * achado exige saber de qual parecer ele é.
   */
  const { auditId, findingId } = lerLinkDoAchado(params);
  const { getResult, saveResult } = useConversation();

  /*
   * O DESFECHO da tentativa, e não o "carregando".
   *
   * `carregando` é DERIVADO na renderização — há um id para abrir, e ainda não
   * houve desfecho. Marcá-lo dentro do efeito seria escrever estado de forma
   * síncrona ali, que é o que `react-hooks/set-state-in-effect` proíbe, e com
   * razão: a renderização já tem a informação, e duplicá-la num estado abre a
   * porta para os dois discordarem.
   */
  const [desfecho, setDesfecho] = useState<{
    id: string;
    falha: string | null;
    tipo: FalhaDoLink | null;
  } | null>(null);

  /*
   * Uma tentativa por id. O efeito depende de funções do store que mudam de
   * identidade quando a conversa muda — e a própria abertura muda a conversa.
   * Sem esta trava, salvar o artefato dispararia o efeito de novo, que salvaria
   * de novo.
   */
  const jaTentou = useRef<string | null>(null);

  const abrir = useCallback(
    async (id: string) => {
      try {
        const resposta = await consultarAuditoria(id);

        if (resposta.situacao === "rodando") {
          setDesfecho(
            resposta.instavel
              ? {
                  id,
                  tipo: "temporaria",
                  falha: "O servidor não respondeu agora. Nada foi perdido — tente de novo.",
                }
              : {
                  id,
                  tipo: "rodando",
                  falha: "Esta auditoria ainda está rodando. Tente de novo em alguns minutos.",
                },
          );
          return;
        }

        if (resposta.situacao === "sem-sessao") {
          // A faixa de sessão expirada já acendeu; aqui só não abrimos o parecer.
          setDesfecho({
            id,
            tipo: "sem-sessao",
            falha: "Sua sessão expirou. Entre de novo para abrir este parecer.",
          });
          return;
        }

        if (resposta.situacao === "sem-acesso") {
          // 403: o escritório recusou esta pessoa; a frase é a do servidor.
          setDesfecho({ id, tipo: "sem-acesso", falha: resposta.motivo });
          return;
        }

        if (resposta.situacao !== "pronta") {
          setDesfecho({
            id,
            tipo: resposta.situacao === "falhou" ? "falhou" : "nao-encontrada",
            falha: resposta.motivo,
          });
          return;
        }

        const parecer = resposta.resultado;

        /*
         * SALVA NA CONVERSA ATUAL, e não numa nova.
         *
         * A primeira versão chamava `newConversation()` antes — e o parecer
         * sumia. `newConversation` troca o id por ESTADO, e o `saveResult` logo
         * em seguida ainda enxergava o id antigo: o artefato ia para a conversa
         * anterior e a nova nascia vazia. A tela ficava no Nexo genérico, com
         * uma conversa a mais na barra a cada clique no link.
         *
         * Quem chega por link chega numa conversa nova de qualquer forma — o
         * store começa uma ao montar. Grafar aqui é o caminho sem corrida.
         */
        await saveResult({
          artifactId: `auditoria:${id}`,
          kind: "auditoria",
          summary: resumoDoParecer(parecer.report),
          files: [],
          payload: parecer,
          canvas: {
            label: "Auditoria",
            detail: detalheDoParecer(parecer.report),
          },
        });

        setDesfecho({ id, falha: null, tipo: null });
      } catch {
        // `fetch` lançou: sem rede, ou a conexão caiu no meio.
        setDesfecho({
          id,
          tipo: "rede",
          falha: "Sem conexão com o servidor. Confira a rede e tente de novo.",
        });
      }
    },
    [saveResult],
  );

  const jaEstaAberta = Boolean(auditId) && Boolean(getResult(`auditoria:${auditId}`));

  useEffect(() => {
    if (!auditId || jaTentou.current === auditId || jaEstaAberta) {
      if (auditId && jaEstaAberta) jaTentou.current = auditId;
      return;
    }

    jaTentou.current = auditId;
    void abrir(auditId);
  }, [auditId, abrir, jaEstaAberta]);

  const tentarDeNovo = useCallback(() => {
    if (!auditId) return;
    jaTentou.current = auditId;
    setDesfecho(null);
    void abrir(auditId);
  }, [auditId, abrir]);

  return {
    pedida: Boolean(auditId),
    carregando: Boolean(auditId) && !jaEstaAberta && desfecho?.id !== auditId,
    falha: desfecho?.id === auditId ? desfecho.falha : null,
    tipoDaFalha: desfecho?.id === auditId ? desfecho.tipo : null,
    tentarDeNovo,
    /*
     * `abriu` existe porque salvar o parecer não basta: a tela de boas-vindas
     * do Nexo só sai quando alguém "começa", e quem chega por link nunca
     * digitou nada. Sem este sinal, o artefato ficava gravado na conversa e a
     * pessoa continuava olhando o "Boa noite".
     */
    abriu: jaEstaAberta || (desfecho?.id === auditId && desfecho.falha === null),
    /*
     * O ACHADO A FOCAR. Só faz sentido depois de o parecer abrir, e por isso
     * acompanha `abriu` na mesma resposta — mandá-lo antes faria a tela procurar
     * um cartão que ainda não existe.
     */
    achadoEmFoco: findingId,
  };
}
