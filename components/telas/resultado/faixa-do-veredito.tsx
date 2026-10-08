"use client";

/**
 * A FAIXA DO VEREDITO — a frase que o resultado devia abrir dizendo.
 *
 * No palco o trilho é só ícones, e o veredito ficava num ponto colorido dentro
 * do anel: "posso emitir?" dependia de cor e de passar o mouse (auditoria UX do
 * memorial, 07/10/2026, U02). A faixa escreve o veredito e o porquê no topo de
 * toda leitura, menos a "geral", que já abre com ele.
 *
 * A SEGUNDA LINHA É O TRATAMENTO, e ela não mexe no veredito (decisão do
 * Matheus, D2): `avaliarEmissao` julga o DOCUMENTO auditado e ignora os
 * desfechos, de propósito — o PDF, o chat e o `Audit.totalFindings` usam a
 * mesma regra. Sem esta linha, quem tratou 5 de 5 via "Revisar antes de emitir"
 * e lia "ainda não terminei".
 */
import { useEffect } from "react";

import { avaliarEmissao, type AuditReport } from "@/lib/audit-report";
import { marcarDica } from "@/modules/nexo/lib/dicas-da-auditoria";
import { plural } from "@/lib/plural";

import { SELO } from "./trilho";
import type { ParecerVivo } from "./use-parecer-vivo";

export function FaixaDoVeredito({
  report,
  parecer,
  total,
  tratados,
}: {
  report: AuditReport;
  parecer: ParecerVivo;
  total: number;
  tratados: number;
}) {
  // Um parecer na tela é a auditoria que terminou: a dica "Enquanto lê" já cumpriu o papel dela.
  useEffect(() => marcarDica("processamento"), []);
  const { estado, veredito } = avaliarEmissao(report);
  const selo = SELO[estado];
  const porque =
    estado === "incompleto"
      ? "Parte do documento não foi lida: os achados valem, mas não dá para liberar."
      : veredito.detail;
  const bloqueiosAbertos = parecer.achados.filter((a) => a.confirmado && a.nivel === "block" && !a.desfecho).length;
  const tudo = total > 0 && tratados >= total;

  return (
    <section className={`re-faixa re-faixa--${selo.tom}`} aria-label="Veredito da auditoria" data-faixa-do-veredito data-tour="faixa-do-veredito">
      <p className="re-faixa-linha">
        <span className="rs-selo">
          <i aria-hidden />
          {selo.rotulo}
        </span>
        <span className="re-faixa-porque">{porque}</span>
      </p>
      {total > 0 && (
        <p className="re-faixa-tratamento">
          {tudo
            ? `Depois do tratamento: todos os ${total} achados tratados${bloqueiosAbertos ? "" : ", nenhum bloqueio em aberto"}. O veredito acima é do documento auditado; para mudá-lo, audite a revisão corrigida.`
            : `${tratados} de ${plural(total, "achado tratado", "achados tratados")}${bloqueiosAbertos ? ` · ${plural(bloqueiosAbertos, "bloqueio em aberto", "bloqueios em aberto")}` : ""}.`}
        </p>
      )}
    </section>
  );
}
