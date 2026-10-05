"use client";

/**
 * MODELO B — "Caixa de entrada".
 *
 * À esquerda, FACETAS sempre à vista (situação, gravidade, disciplina,
 * responsável), como as pastas e etiquetas de um e-mail: o filtro não fica
 * escondido atrás de um botão. No centro, UMA lista larga; o achado abre
 * dentro da própria linha (sanfona), com prévia e ações — a lista nunca some.
 */
import { ChevronDown } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

import { Seletor } from "@/components/ds/basicos";
import { NIVEIS } from "@/lib/nivel-do-achado";

import {
  AbasDoAchado,
  AcoesDoAchado,
  BarraDeSelecao,
  Busca,
  CabecaDoAchado,
  FaixasDoAchado,
  Faltou,
  LinhaDoAchado,
  Notificar,
  Partes,
  Previa,
  Responsavel,
  SugestoesDaIA,
} from "@/components/telas/resultado/fila-a/pecas";
import { NOMES_DO_FILTRO, type Filtro, type Fila } from "@/components/telas/resultado/fila-a/use-fila";

function Faceta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="am-faceta">
      <h4>{titulo}</h4>
      {children}
    </div>
  );
}

export function ModeloB({ f }: { f: Fila }) {
  const [fechado, setFechado] = useState(false);
  const aberto = fechado ? null : f.atual?.chave;
  const ref = useRef<HTMLDivElement>(null);

  // J/K abrem o próximo — e a linha aberta vem para a vista.
  useEffect(() => {
    ref.current?.querySelector(".am-b-aberto")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [aberto]);

  const lista = [...f.visiveis, ...f.meusCorrigidos.filter((m) => !f.visiveis.includes(m))];

  return (
    <div className="am-b">
      <aside className="am-b-facetas" aria-label="Filtros">
        <Faceta titulo="Situação">
          {(["pendentes", "meus", "sem", "corrigidos", "encerrados", "todos"] as Filtro[]).map((v) => (
            <button key={v} type="button" className="am-faceta-item" aria-pressed={f.filtro === v} onClick={() => f.setFiltro(v)}>
              {NOMES_DO_FILTRO[v]}
              <em className="ds-num">{f.contagem[v]}</em>
            </button>
          ))}
        </Faceta>
        <Faceta titulo="Gravidade">
          {NIVEIS.map((n) => (
            <button key={n.id} type="button" className="am-faceta-item" aria-pressed={f.niveis.includes(n.id)} onClick={() => f.alternarEm(f.niveis, f.setNiveis, n.id)}>
              <i className={`rs-ponto rs-ponto--${n.id}`} />
              {n.nome}
              <em className="ds-num">{f.confirmados.filter((a) => a.nivel === n.id).length}</em>
            </button>
          ))}
        </Faceta>
        <Faceta titulo="Disciplina">
          {f.discsPresentes.map((d) => (
            <button key={d.id} type="button" className={`am-faceta-item dc--${d.id}`} aria-pressed={f.discs.includes(d.id)} onClick={() => f.alternarEm(f.discs, f.setDiscs, d.id)}>
              <i className="dc-ponto" />
              {d.nome}
              <em className="ds-num">{d.n}</em>
            </button>
          ))}
        </Faceta>
        {f.tiposPresentes.length > 0 && (
          <Faceta titulo="Tipo">
            {f.tiposPresentes.map((t) => (
              <button key={t.id} type="button" className="am-faceta-item" aria-pressed={f.tipos.includes(t.id)} onClick={() => f.alternarEm(f.tipos, f.setTipos, t.id)}>
                {t.nome}
                <em className="ds-num">{t.n}</em>
              </button>
            ))}
          </Faceta>
        )}
        <Faceta titulo="Responsável">
          <Seletor valor={f.responsavel} onTroca={f.setResponsavel} opcoes={[{ valor: "qualquer", rotulo: "Qualquer" }, ...f.pessoas.map((p) => ({ valor: p.email, rotulo: p.souEu ? "Você" : p.nome }))]} />
        </Faceta>
        <Faceta titulo="Ordem">
          <Seletor
            valor={f.ordem}
            onTroca={f.setOrdem}
            opcoes={[
              { valor: "impacto", rotulo: "Por impacto" },
              { valor: "pagina", rotulo: "Por página" },
              { valor: "disciplina", rotulo: "Por disciplina" },
              { valor: "referencia", rotulo: "Por referência" },
            ]}
          />
        </Faceta>
        {f.nFiltros > 0 && (
          <button type="button" className="rs-link" onClick={f.limparFiltros}>
            Limpar filtros
          </button>
        )}
        <Faltou f={f} />
      </aside>

      <section className="am-b-caixa" aria-label="Achados">
        <div className="am-b-topo">
          <Busca f={f} />
          <span className="ds-num am-b-conta">
            {lista.length} de {f.confirmados.length}
          </span>
          <Notificar f={f} compacto />
        </div>
        <BarraDeSelecao f={f} flutuante={false} />
        <div className="am-rolagem" ref={ref}>
          {lista.length === 0 && <p className="rs-vazio">Nenhum achado com esse filtro.</p>}
          {lista.map((a) => {
            const estaAberto = a.chave === aberto;
            return (
              <Fragment key={a.chave}>
                <div className={`am-b-item${estaAberto ? " am-b-aberto" : ""}`}>
                  <div className="am-b-cabeca">
                    <LinhaDoAchado
                      f={f}
                      a={a}
                      rapidas={!estaAberto}
                      onAbrir={() => {
                        if (a.chave === f.atual?.chave) setFechado(!fechado);
                        else {
                          f.abrir(a.chave);
                          setFechado(false);
                        }
                      }}
                    />
                    <ChevronDown size={14} className="am-b-seta" style={{ transform: estaAberto ? "rotate(180deg)" : undefined }} aria-hidden />
                  </div>
                  {estaAberto && (
                    <div className="am-b-corpo">
                      <CabecaDoAchado f={f} a={a} />
                      <FaixasDoAchado f={f} a={a} compacta />
                      <div className="am-b-grade">
                        <div>
                          <Partes f={f} a={a} juntar />
                          <Responsavel f={f} a={a} />
                        </div>
                        <Previa f={f} a={a} />
                      </div>
                      <AbasDoAchado f={f} a={a} />
                      <AcoesDoAchado f={f} a={a} />
                    </div>
                  )}
                </div>
              </Fragment>
            );
          })}
          <SugestoesDaIA f={f} />
        </div>
      </section>
    </div>
  );
}
