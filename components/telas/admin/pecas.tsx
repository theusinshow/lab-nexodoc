"use client";

import { ArrowRight, CircleAlert, Info, RotateCw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Botao, Girando } from "@/components/ds/basicos";
import { LinhaDeTendencia } from "@/components/ds/medidas";
import { fraseDaFalha, type FalhaDaCarga, type FaseDaCarga } from "@/lib/estado-da-carga";
import { formatarEmBrasilia, mesmoDiaEmBrasilia } from "@/lib/fuso-de-brasilia";

/*
 * AS PEÇAS DO ADMIN no sistema novo. A regra de carga continua a de
 * `lib/estado-da-carga`: só se afirma vazio, zero ou configuração ausente
 * depois de uma resposta do servidor que diga isso.
 */

/** Data curta para tabela: "hoje, 16:17" ou "24/09 16:17" (no relógio de Brasília). */
export function quandoCurto(iso: string) {
  const hora = formatarEmBrasilia(iso, { hour: "2-digit", minute: "2-digit" });
  return mesmoDiaEmBrasilia(iso, new Date()) ? `hoje, ${hora}` : `${formatarEmBrasilia(iso, { day: "2-digit", month: "2-digit" })} ${hora}`;
}

/** O aviso de carga: sem token, carregando ou falha — "ok" não mostra nada. */
export function AvisoDaCarga({
  fase,
  erro,
  detalhe,
  oque,
  atualizadoEm,
  onTentar,
}: {
  fase: FaseDaCarga;
  erro?: FalhaDaCarga | null;
  detalhe?: string | null;
  /** "os números", "as pessoas"… entra nas frases. */
  oque: string;
  atualizadoEm?: string | null;
  onTentar?: () => void;
}) {
  if (fase === "ok") return null;
  if (fase === "sem-token")
    return (
      <div className="adm-aviso adm-aviso--info" role="status" data-carga="sem-token">
        <Info size={15} aria-hidden />
        <p>Nada foi consultado ainda. Informe o token de administração no rodapé do trilho, à esquerda, para carregar {oque}.</p>
      </div>
    );
  if (fase === "carregando")
    return (
      <div className="adm-aviso adm-aviso--info" role="status" data-carga="carregando">
        <Girando tamanho={14} />
        <p>
          Carregando {oque}…
          {atualizadoEm && <span className="adm-aviso-sub"> (na tela: dados de {formatarEmBrasilia(atualizadoEm, { timeStyle: "short" })})</span>}
        </p>
      </div>
    );
  const tipo = erro ?? "servidor";
  return (
    <div
      className="adm-aviso adm-aviso--erro"
      role="alert"
      data-carga="erro"
      data-falha={tipo}
    >
      <CircleAlert size={15} aria-hidden />
      <div>
        <p>{fraseDaFalha(tipo, detalhe)}</p>
        <p className="adm-aviso-sub">
          {atualizadoEm
            ? `Os dados abaixo são de ${formatarEmBrasilia(atualizadoEm, { dateStyle: "short", timeStyle: "short" })}, anteriores à falha.`
            : "Nenhum dado foi carregado — o que aparece abaixo não é resposta do servidor."}
        </p>
      </div>
      {onTentar && (
        <Botao variante="ghost" tamanho="sm" onClick={onTentar}>
          <RotateCw size={13} /> Tentar de novo
        </Botao>
      )}
    </div>
  );
}

/**
 * UM NÚMERO da régua do cockpit: rótulo, valor, o que qualifica o valor e, se
 * houver, a linha dos últimos 14 dias. Com destino, o número inteiro é o link.
 */
export function Numero({ rotulo, valor, detalhe, alerta, para, href, serie }: { rotulo: string; valor: ReactNode; detalhe: string; alerta?: boolean; para?: string; href?: string; serie?: number[] }) {
  const corpo = (
    <>
      <span className="adm-num-rotulo">
        {alerta && <i aria-hidden />}
        {rotulo}
      </span>
      <b className="ds-num">{valor}</b>
      <span className="adm-num-detalhe">{detalhe}</span>
      {serie && serie.length > 1 && (
        <span className="adm-num-linha" title="Últimos 14 dias">
          <LinhaDeTendencia valores={serie} alerta={alerta} altura={28} />
        </span>
      )}
      {href && <ArrowRight size={13} className="adm-num-seta" aria-hidden />}
    </>
  );
  const classe = `adm-num${alerta ? " adm-num--alerta" : ""}`;
  return href ? (
    <Link href={href} className={classe} title={para ? `Abrir ${para}` : undefined}>
      {corpo}
    </Link>
  ) : (
    <div className={classe}>{corpo}</div>
  );
}

/** Um número de período (Dinheiro): sem destino, com a linha do período embaixo. */
export function NumeroDoPeriodo({ rotulo, valor, detalhe, serie }: { rotulo: string; valor: ReactNode; detalhe: string; serie?: number[] }) {
  return (
    <div className="adm-num adm-num--fixo din-num">
      <span className="adm-num-rotulo">{rotulo}</span>
      <b className="ds-num">{valor}</b>
      <span className="adm-num-detalhe">{detalhe}</span>
      {serie && serie.length > 1 && (
        <span className="din-num-linha">
          <LinhaDeTendencia valores={serie} />
        </span>
      )}
    </div>
  );
}

/** Um bloco de painel com título; o conteúdo vem embaixo. */
export function Bloco({ id, titulo, acoes, children, className = "" }: { id: string; titulo: ReactNode; acoes?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`adm-bloco ${className}`} aria-labelledby={id}>
      <header>
        <h2 id={id}>{titulo}</h2>
        {acoes}
      </header>
      {children}
    </section>
  );
}

/** Os estados do banco viram palavra de gente, minúscula, com o ponto da cor. */
const PALAVRA: Record<string, string> = {
  COMPLETED: "concluída",
  PROCESSING: "rodando",
  FAILED: "falhou",
  CANCELED: "cancelada",
  DRAFT: "rascunho",
  GENERATED: "gerada",
  ARCHIVED: "arquivada",
};
const CLASSE: Record<string, string> = { COMPLETED: "concluida", PROCESSING: "rodando", FAILED: "falhou", CANCELED: "cancelada", DRAFT: "rascunho", GENERATED: "gerada", ARCHIVED: "arquivada" };

export function Situacao({ status }: { status: string }) {
  return (
    <span className={`adm-status adm-status--${CLASSE[status] ?? "outro"}`}>
      <i aria-hidden />
      {PALAVRA[status] ?? status.toLowerCase()}
    </span>
  );
}
