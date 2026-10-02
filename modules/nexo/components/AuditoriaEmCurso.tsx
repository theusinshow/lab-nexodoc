"use client";

/**
 * O que a auditoria está fazendo, enquanto faz.
 *
 * Agora os marcos vêm do MOTOR (`/api/audit` em modo de fluxo), não de um
 * cronômetro. Antes a etapa atual era estimada pelo tempo decorrido — e
 * estimativa envelhece mal: em documento grande a barra passava do previsto e a
 * interface não sabia dizer se estava perto do fim ou parada.
 *
 * O que continua honesto por construção: as duas etapas longas (leitura do
 * documento e validação) são UMA ida ao modelo, sem sinal interno. Delas o motor
 * manda início, fim e o TETO de tempo — nunca porcentagem. Estourado o teto, o
 * rodapé diz que passou do previsto, e o veredito ANÁLISE PARCIAL no fim
 * confirma o que a interface já tinha preparado, em vez de contradizer um
 * "quase pronto".
 *
 * As etapas listadas são as que aquele nível REALMENTE roda: no Profundo os
 * blocos por capítulo não aparecem, porque lá eles são cortados e o documento é
 * lido inteiro.
 */

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import { Botao, Orbe } from "@/components/ds/basicos";
import { NOME_DA_PASSADA, type PassadaDaAuditoria } from "@/lib/audit-progress";
import { etapasDosMarcos, type MarcoRecebido } from "../lib/etapas-da-auditoria";
import "@/components/telas/nexo/auditoria-em-curso.css";

/** O que cada passada faz, em uma linha. Só aparece na etapa em curso. */
const DETALHE: Record<PassadaDaAuditoria, string> = {
  extracao: "Extrai o texto de todas as páginas do PDF.",
  regras: "Regras determinísticas, sem IA: obra divergente, contradição entre capítulos.",
  global: "Uma leitura da IA sobre o documento — é a etapa mais longa.",
  blocos: "Blocos por capítulo, para alcançar o que a leitura única não cobriu.",
  evidencia: "Descarta achado que não se ancora em trecho real do documento.",
  confronto: "Compara os documentos entre si — divergência de identidade entre arquivos.",
  validacao: "Segunda passada: rebaixa o incerto em vez de apagá-lo.",
  parecer: "Ordena por impacto e fecha o veredito de emissão.",
};

function formatarTempo(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}min ${String(s % 60).padStart(2, "0")}s`;
}

export function AuditoriaEmCurso({
  nivel,
  arquivo,
  inicioMs,
  marcos,
  onCancelar,
  retomada = false,
}: {
  nivel: "standard" | "deep";
  /** Nome do documento em análise. */
  arquivo: string;
  /** `Date.now()` de quando começou. */
  inicioMs: number;
  /** Os marcos relatados pelo motor, na ordem em que chegaram. */
  marcos: MarcoRecebido[];
  onCancelar?: () => void;
  /**
   * Auditoria herdada de outra sessão (F5, troca de conversa). Não há marcos:
   * o fluxo de eventos morreu com a conexão anterior. Dizer isso é melhor do
   * que reencenar as etapas por tempo, que é justamente o que esta tela
   * deixou de fazer.
   */
  retomada?: boolean;
}) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const decorrido = agora - inicioMs;
  const etapas = etapasDosMarcos(marcos);
  const emCurso = etapas.find((e) => !e.concluida);

  /*
   * "Passou do previsto" só se afirma sobre uma etapa que declarou orçamento —
   * e medindo o tempo DELA, não o da auditoria inteira. Somar tudo faria a tela
   * acusar atraso em documento grande onde nada está atrasado.
   */
  const estourou =
    emCurso?.orcamentoMs !== undefined && agora - emCurso.inicioMs > emCurso.orcamentoMs;

  /*
   * O PAINEL DA AUDITORIA RODANDO (desenho do lab: Auditoria, "em curso"):
   * o estado e o arquivo em cima, o cronômetro ao lado, Cancelar discreto, e
   * as etapas como o registro do Nexo — visto quando acabou, o orbe girando
   * na que está em curso. O detalhe é o FATO que o motor mediu; só sem ele
   * entra a frase genérica da etapa.
   */
  const concluidas = etapas.filter((e) => e.concluida).length;
  return (
    <section className="nx-aud" aria-live="polite" aria-busy="true">
      <header className="nx-aud-cabeca">
        <div className="nx-aud-texto">
          {/* Sem adjetivo de nível: há um só desde 17/08/2026. */}
          <span className="nx-aud-estado">
            <i aria-hidden />
            Auditoria em curso
          </span>
          <p className="nx-aud-arquivo" title={arquivo}>
            {arquivo}
          </p>
        </div>
        <div className="nx-aud-relogio">
          <b className="ds-num">{formatarTempo(decorrido)}</b>
          <small>{etapas.length ? `${concluidas} de ${etapas.length} etapas` : "decorrido"}</small>
        </div>
        {onCancelar && (
          <Botao variante="quiet" tamanho="sm" onClick={onCancelar}>
            <X size={13} aria-hidden />
            Cancelar
          </Botao>
        )}
      </header>

      {etapas.length === 0 ? (
        <p className="nx-aud-espera">
          {retomada ? "Esta análise já estava rodando no servidor. O resultado aparece aqui quando ela terminar." : "Enviando o documento para análise…"}
        </p>
      ) : (
        <ol className="nx-aud-etapas">
          {etapas.map((etapa) => {
            const atual = etapa === emCurso;
            const contagem = etapa.total !== undefined && etapa.indice !== undefined && !etapa.concluida ? ` — ${etapa.indice} de ${etapa.total}` : "";
            return (
              <li key={etapa.passada} className={atual ? "nx-aud-etapa nx-aud-etapa--atual" : "nx-aud-etapa"}>
                <span className="nx-aud-icone">{etapa.concluida ? <Check size={13} aria-hidden /> : <Orbe tamanho={11} estado="trabalhando" />}</span>
                <div>
                  <p className="nx-aud-nome">
                    {NOME_DA_PASSADA[etapa.passada]}
                    {contagem}
                  </p>
                  {(atual || etapa.detalhe) && <p className="nx-aud-detalhe">{etapa.detalhe ?? DETALHE[etapa.passada]}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <footer className="nx-aud-pe">
        {estourou ? (
          <p className="nx-aud-nota nx-aud-nota--aviso">Esta etapa passou do tempo previsto; pode voltar incompleta. A análise continua rodando no servidor.</p>
        ) : retomada ? (
          /* Informativo, não alarme: sem esta linha o engenheiro não entendia por que as etapas não apareciam. */
          <p className="nx-aud-nota nx-aud-nota--info">Reconectada a uma análise já em curso — sem as etapas, que se perderam com a conexão anterior.</p>
        ) : (
          <p className="nx-aud-nota">As etapas são relatadas pelo motor conforme acontecem.</p>
        )}
      </footer>
    </section>
  );
}
