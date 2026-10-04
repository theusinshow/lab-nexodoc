"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { useAdminToken } from "@/components/admin/admin-token";
import { Girando, Segmento } from "@/components/ds/basicos";
import { diaEmBrasilia, formatarDataHora, formatarHora } from "@/lib/fuso-de-brasilia";
import { plural } from "@/lib/plural";

/*
 * A ATIVIDADE DE UMA PESSOA, dentro da ficha em Administração → Pessoas
 * (03/10/2026). Responde "o que essa pessoa faz": quando entrou, quanto custou e
 * o que fez, no período. Os dados são de GET /api/admin/users/atividade; o
 * acesso só existe a partir de 03/10/2026 (antes, o login não era registrado).
 */

type Item = { quando: string; tipo: string; titulo: string; detalhe: string; href: string | null };
type Atividade = {
  dias: number;
  totais: { auditorias: number; conversas: number; lds: number; documentos: number; achadosResolvidos: number; recusas: number; diasComAcesso: number; custoUsd: number };
  acessos: { dia: string; primeiro: string; ultimo: string; marcas: number }[];
  custoPorDia: { dia: string; usd: number }[];
  itens: Item[];
};

const ROTULO: Record<string, string> = {
  auditoria: "Auditoria",
  conversa: "Conversa",
  ld: "LD",
  documento: "Documento",
  achado: "Achado",
  obra: "Obra",
  recusa: "Barrado",
};

const usd = (v: number) => `US$ ${v.toFixed(2).replace(".", ",")}`;

export function AtividadeDaPessoa({ email }: { email: string }) {
  const { token } = useAdminToken();
  const [dias, setDias] = useState<"7" | "30" | "90">("30");
  const [dados, setDados] = useState<Atividade | null>(null);
  const [erro, setErro] = useState("");
  const [mostrar, setMostrar] = useState(25);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/admin/users/atividade?email=${encodeURIComponent(email)}&dias=${dias}`, { cache: "no-store", headers: token ? { Authorization: `Bearer ${token.trim()}` } : {} })
      .then(async (r) => {
        const corpo = await r.json().catch(() => null);
        if (!vivo) return;
        if (!r.ok) setErro(corpo?.error ?? `A atividade não carregou (${r.status}).`);
        else (setErro(""), setDados(corpo as Atividade));
      })
      .catch(() => vivo && setErro("A atividade não carregou: sem conexão com o servidor."));
    return () => {
      vivo = false;
    };
  }, [email, dias, token]);

  // Os dias do período, do mais antigo para hoje: cada um é uma coluna da tira.
  const n = Number(dias);
  // O "hoje" da tira, lido uma vez na abertura da ficha (o render é puro).
  const [hoje] = useState(() => Date.now());
  const periodo = Array.from({ length: n }, (_, i) => diaEmBrasilia(new Date(hoje - (n - 1 - i) * 86_400_000)));
  const acessoDoDia = new Map((dados?.acessos ?? []).map((a) => [a.dia, a]));
  const custoDoDia = new Map((dados?.custoPorDia ?? []).map((c) => [c.dia, c.usd]));
  const maiorCusto = Math.max(0.01, ...custoDoDia.values());

  return (
    <section className="pb-atv" aria-label={`Atividade de ${email}`}>
      <header className="pb-atv-cabeca">
        <b>Atividade</b>
        <Segmento
          rotulo="Período"
          valor={dias}
          onTroca={(v) => (setDias(v), setMostrar(25))}
          opcoes={[
            { valor: "7", rotulo: "7 dias" },
            { valor: "30", rotulo: "30 dias" },
            { valor: "90", rotulo: "90 dias" },
          ]}
        />
      </header>

      {erro ? (
        <p className="pb-atv-erro">{erro}</p>
      ) : !dados ? (
        <p className="adm-fraco pb-atv-carregando">
          <Girando tamanho={12} /> carregando
        </p>
      ) : (
        <>
          <dl className="pb-atv-totais">
            {(
              [
                ["Dias com acesso", `${dados.totais.diasComAcesso} de ${dados.dias}`],
                ["Auditorias", dados.totais.auditorias],
                ["Conversas", dados.totais.conversas],
                ["LDs", dados.totais.lds],
                ["Documentos", dados.totais.documentos],
                ["Achados resolvidos", dados.totais.achadosResolvidos],
                ["Custo de IA", usd(dados.totais.custoUsd)],
                ...(dados.totais.recusas ? ([["Vezes barrado", dados.totais.recusas]] as const) : []),
              ] as const
            ).map(([r, v]) => (
              <div key={r}>
                <dt>{r}</dt>
                <dd className="ds-num">{v}</dd>
              </div>
            ))}
          </dl>

          {/* A tira: um quadrado por dia (aceso = entrou) e, embaixo, o custo do dia em altura. */}
          <div className="pb-atv-tira" role="img" aria-label={`${plural(dados.totais.diasComAcesso, "dia", "dias")} com acesso em ${dados.dias}`}>
            {periodo.map((dia) => {
              const a = acessoDoDia.get(dia);
              const c = custoDoDia.get(dia) ?? 0;
              const [ano, mes, d] = dia.split("-");
              const titulo = `${d}/${mes}/${ano}: ${a ? `entrou às ${formatarHora(a.primeiro)}, último às ${formatarHora(a.ultimo)}` : "sem acesso"}${c ? ` · ${usd(c)}` : ""}`;
              return (
                <span key={dia} className="pb-atv-dia" title={titulo}>
                  <i className={a ? "pb-atv-dia--entrou" : undefined} />
                  <em style={{ height: `${Math.round((c / maiorCusto) * 100)}%` }} />
                </span>
              );
            })}
          </div>

          {dados.itens.length === 0 ? (
            <p className="adm-fraco pb-atv-vazio">Nada no período.</p>
          ) : (
            <ol className="pb-atv-linha">
              {dados.itens.slice(0, mostrar).map((it, i) => (
                <li key={`${it.quando}-${i}`} className={it.tipo === "recusa" ? "pb-atv-item--recusa" : undefined}>
                  <span className="ds-num adm-fraco">{formatarDataHora(it.quando)}</span>
                  <span className="pb-atv-tipo">{ROTULO[it.tipo] ?? it.tipo}</span>
                  <span className="pb-atv-texto">
                    <b>{it.titulo}</b>
                    {it.detalhe && <small>{it.detalhe}</small>}
                  </span>
                  {it.href ? (
                    <a className="pb-atv-abrir" href={it.href} target="_blank" rel="noreferrer" aria-label={`Abrir: ${it.titulo}`}>
                      <ExternalLink size={13} aria-hidden />
                    </a>
                  ) : (
                    <span />
                  )}
                </li>
              ))}
            </ol>
          )}
          {dados.itens.length > mostrar && (
            <button type="button" className="pb-atv-mais" onClick={() => setMostrar((m) => m + 50)}>
              Mostrar mais {Math.min(50, dados.itens.length - mostrar)} de {dados.itens.length - mostrar}
            </button>
          )}
        </>
      )}
    </section>
  );
}
