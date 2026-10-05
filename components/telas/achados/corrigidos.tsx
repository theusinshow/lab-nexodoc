"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { corrigidoPor, type AchadoCorrigido } from "@/lib/achados-corrigidos-tipos";
import { useTempo } from "@/lib/ds/tempo";
import { linkDoAchado } from "@/lib/link-do-achado";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { diasDesde, quandoNaLinha } from "../comum/quando";
import { RITMO, SUAVE } from "../comum/ritmo";
import { plural, semAcento } from "../comum/texto";

/*
 * CORRIGIDOS (05/10/2026): o que foi resolvido no documento, de todas as obras.
 * Por padrão os SEUS — estava com você ou você marcou —; o seletor troca para
 * outra pessoa ou para o escritório todo, que é o que a coordenação usa para
 * ver o que cada um fez. Ver [[lib/achados-corrigidos.ts]].
 */

const TODOS = "__todos__";
const abrir = (a: AchadoCorrigido) => linkDoAchado({ base: "", auditId: a.auditId, findingId: a.findingId });

export function CorrigidosDoEscritorio({ lista, euSou }: { lista: AchadoCorrigido[]; euSou: string }) {
  const { k } = useTempo();
  const router = useRouter();
  const eu = euSou.toLowerCase();
  const [pessoa, setPessoa] = useState(eu);
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  // Quem aparece na lista — quem marcou ou com quem estava —, pelo nome.
  const pessoas = useMemo(() => {
    const nomes = new Map<string, string>();
    for (const a of lista) {
      if (a.porEmail) nomes.set(a.porEmail, a.porNome ?? a.porEmail);
      if (a.comEmail) nomes.set(a.comEmail, a.comNome ?? a.comEmail);
    }
    nomes.delete(eu);
    return [...nomes.entries()].sort((x, y) => x[1].localeCompare(y[1], "pt-BR"));
  }, [lista, eu]);

  const visiveis = useMemo(
    () =>
      lista.filter(
        (a) =>
          (pessoa === TODOS || corrigidoPor(a, pessoa)) &&
          (!busca || semAcento(`${a.codigo} ${a.obra} ${a.parecer} ${a.rotulo} ${a.titulo} ${a.porNome ?? ""} ${a.comNome ?? ""}`).includes(semAcento(busca))),
      ),
    [lista, pessoa, busca],
  );
  const escolhido = visiveis.find((a) => a.chave === sel) ?? null;
  const nomeDaPessoa = pessoa === eu ? "você" : pessoa === TODOS ? "o escritório" : (pessoas.find(([e]) => e === pessoa)?.[1] ?? pessoa);

  const andar = (d: number) => {
    if (!visiveis.length) return;
    const i = escolhido ? visiveis.indexOf(escolhido) : -1;
    setSel(visiveis[Math.min(visiveis.length - 1, Math.max(0, i < 0 ? 0 : i + d))].chave);
  };
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest("input, textarea, select") || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowDown" || e.key === "j") (e.preventDefault(), andar(1));
      else if (e.key === "ArrowUp" || e.key === "k") (e.preventDefault(), andar(-1));
      else if (e.key === "/") (e.preventDefault(), campo.current?.focus());
      else if (e.key === "Enter" && escolhido && !alvo.closest("button, a")) (e.preventDefault(), router.push(abrir(escolhido)));
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  const semana = visiveis.filter((a) => diasDesde(a.corrigidoEm) < 7).length;

  return (
    <div className="mp-miolo">
      <div className="mp-principal">
        <div className="mp-ferramentas">
          <label className="ac-pessoa">
            <span>De</span>
            <select value={pessoa} onChange={(e) => (setPessoa(e.target.value), setSel(null))} aria-label="De quem são os corrigidos">
              <option value={eu}>Você</option>
              <option value={TODOS}>Todo o escritório</option>
              {pessoas.map(([email, nome]) => (
                <option key={email} value={email}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
          <label className="mp-busca pr-busca">
            <Search size={14} />
            <input ref={campo} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Obra, parecer, pessoa ou ACH" aria-label="Buscar nos corrigidos" />
            <Tecla>/</Tecla>
          </label>
        </div>

        {visiveis.length === 0 ? (
          <div className="pj-sem pr-vazio">
            <p>{busca ? "Nenhum corrigido com essa busca." : pessoa === eu ? "Você ainda não tem achados corrigidos." : `Nenhum achado corrigido por ${nomeDaPessoa}.`}</p>
            <p className="mp-g-fraco">Quando um achado que estava com a pessoa — ou que ela marcou — for corrigido no documento, ele fica guardado aqui.</p>
          </div>
        ) : (
          <div className="mp-grade ac-grade ac-grade--corrigidos" role="grid">
            <div className="mp-g-cab" role="row">
              <span>#</span>
              <span>Obra</span>
              <span>Achado</span>
              <span>Estava com</span>
              <span>Marcou</span>
              <span>Quando</span>
              <span />
            </div>
            {visiveis.map((a, i) => {
              const ativo = sel === a.chave;
              return (
                <div key={a.chave} role="row" aria-selected={ativo} className="mp-g-linha pj-linha ac-corrigido" onClick={() => setSel(ativo ? null : a.chave)} onDoubleClick={() => router.push(abrir(a))}>
                  {ativo && <motion.i layoutId="ac-sel-corrigido" className="mp-g-sel" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                  <span className="mp-g-n ds-num">{i + 1}</span>
                  <span className="pj-codigo">
                    <MarcaDaPrefeitura prefeitura={a.cliente} forma="sinal" />
                    <span className="mp-mono">{a.codigo}</span>
                  </span>
                  <span className="ac-parecer">
                    <b>{a.titulo}</b>
                    <span className="mp-g-fraco">
                      <span className="mp-mono">{a.rotulo}</span>
                      {a.pagina ? ` · p. ${a.pagina}` : ""} · {a.obra}
                    </span>
                  </span>
                  <span className="mp-g-fraco">{a.comEmail === eu ? "você" : (a.comNome ?? "—")}</span>
                  <span className="mp-g-fraco">{a.porEmail === eu ? "você" : (a.porNome ?? "—")}</span>
                  <span className="ds-num mp-g-fraco">{quandoNaLinha(a.corrigidoEm)}</span>
                  <ArrowRight size={14} className="pj-seta" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <aside className="mp-lado" aria-label={escolhido ? escolhido.titulo : "Resumo dos corrigidos"}>
        <div className="mp-lado-troca">
          <AnimatePresence initial={false}>
            <motion.div key={escolhido ? escolhido.chave : `resumo-${pessoa}`} className="mp-lado-camada" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
              {escolhido ? (
                <div className="mp-lado-bloco">
                  <div className="pj-obra-cabeca">
                    <p className="mp-trilha">
                      <MarcaDaPrefeitura prefeitura={escolhido.cliente} forma="selo" />
                      <span className="mp-mono">{escolhido.codigo}</span>
                    </p>
                    <p className="mp-lado-sub ac-obra">{escolhido.obra}</p>
                    <p className="pj-obra-nome">{escolhido.titulo}</p>
                    <p className="ac-corrigido-selo">
                      <Check size={13} aria-hidden /> Corrigido {quandoNaLinha(escolhido.corrigidoEm)}
                      {escolhido.porNome ? `, marcado por ${escolhido.porEmail === eu ? "você" : escolhido.porNome}` : ""}
                    </p>
                    <p className="mp-lado-sub">
                      <span className="mp-mono">{escolhido.rotulo}</span>
                      {escolhido.pagina ? ` · p. ${escolhido.pagina}` : ""} · {escolhido.parecer}
                      {escolhido.comNome ? ` · estava com ${escolhido.comEmail === eu ? "você" : escolhido.comNome}` : ""}
                    </p>
                  </div>
                  <div className="mp-lado-pe">
                    <Botao variante="ghost" className="mp-gerar" onClick={() => router.push(abrir(escolhido))}>
                      Abrir o achado <Tecla>↵</Tecla>
                    </Botao>
                  </div>
                </div>
              ) : (
                <div className="mp-lado-bloco">
                  <div className="mp-lista-cabeca">
                    <p className="mp-lado-titulo">Corrigidos — {nomeDaPessoa}</p>
                    <p className="mp-lado-sub">
                      {plural(visiveis.length, "achado corrigido", "achados corrigidos")} em {plural(new Set(visiveis.map((a) => a.auditId)).size, "parecer", "pareceres")}
                      {semana ? `; ${semana} nos últimos 7 dias` : ""}. Abrir leva ao achado no parecer.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </aside>
    </div>
  );
}
