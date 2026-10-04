"use client";

import { RotateCw, Search } from "lucide-react";
import { useCallback, useContext, useEffect, useState } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";

import { ControleDoTopo, Topo } from "../_comum/topo";
import { useIr } from "../_comum/prototipo";
import { TelaProjeto } from "../projeto/tela-projeto";
import { Confirmacoes } from "./confirmacoes";
import { AVISOS, PORTAO, type ModeloDeAviso } from "./dados";
import { Atalhos, Avisos, juntarAviso, Paleta, type Aviso } from "./sobreposicoes";
import "./pecas.css";
import "../admin/pessoas-banco.css";

/*
 * AS PEÇAS DE TODA TELA. As sobreposições aparecem por cima da tela de
 * Projeto aprovada (é ela que está no fundo, de verdade, com o Topo ligado):
 * Ctrl K abre a paleta, ? abre os atalhos, o avatar abre o menu da conta. A
 * confirmação, a página que não existe e a tela estreita têm palco próprio.
 */

export type SituacaoPecas = "paleta" | "atalhos" | "aviso" | "menu" | "sino" | "pular" | "confirmacao" | "404" | "erro" | "estreita" | "pilula" | "pilula-estreita";

function digitando(alvo: EventTarget | null) {
  const el = alvo as HTMLElement | null;
  return !!el?.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']");
}

export function TelaPecas({ situacao }: { situacao: SituacaoPecas }) {
  const [paleta, setPaleta] = useState<{ q: string } | null>(situacao === "paleta" ? { q: "" } : null);
  const [atalhos, setAtalhos] = useState(situacao === "atalhos");
  const [avisos, setAvisos] = useState<Aviso[]>(
    situacao === "aviso"
      ? [
          { id: 1, ...AVISOS.rede, link: undefined },
          { id: 2, ...AVISOS.parcial, link: undefined },
          { id: 3, ...AVISOS.atribuidos, link: undefined },
        ]
      : [],
  );

  const abrirPaleta = useCallback((q = "") => (setAtalhos(false), setPaleta({ q })), []);
  const abrirAtalhos = useCallback(() => (setPaleta(null), setAtalhos(true)), []);
  const fecharAviso = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);
  const avisar = (m: ModeloDeAviso) =>
    setAvisos((a) => juntarAviso(a, { ...m, link: m.link ? `${location.origin}/nexo?auditoria=cm1x8a&achado=INC-014` : undefined }));
  // "Tentar de novo" troca a falha pelo desfecho; as outras ações levam a outra tela.
  const agir = (a: Aviso) => (fecharAviso(a.id), a.acao === "Tentar de novo" && avisar(AVISOS.atribuidos));

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (paleta) setPaleta(null);
        else abrirPaleta();
      } else if (e.key === "?" && !digitando(e.target)) {
        e.preventDefault();
        if (atalhos) setAtalhos(false);
        else abrirAtalhos();
      }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [paleta, atalhos, abrirPaleta, abrirAtalhos]);

  const sobre = (
    <>
      <Paleta aberta={!!paleta} inicialQ={paleta?.q} onFechar={() => setPaleta(null)} />
      <Atalhos aberta={atalhos} onFechar={() => setAtalhos(false)} />
      <Avisos avisos={avisos} onFechar={fecharAviso} onAcao={agir} />
    </>
  );
  const pai = useContext(ControleDoTopo);
  const ir = useIr();
  const controle = {
    ...pai,
    onBusca: () => abrirPaleta(),
    onAtalhos: abrirAtalhos,
    aberto: situacao === "menu" ? ("menu" as const) : situacao === "sino" ? ("sino" as const) : null,
    pularVisivel: situacao === "pular",
    estilo: situacao === "pilula" || situacao === "pilula-estreita" ? ("pilula" as const) : pai.estilo,
  };

  if (situacao === "confirmacao")
    return (
      <ControleDoTopo.Provider value={controle}>
        <div className="pc-tela">
          <Topo atual="Projetos" />
          <main id="conteudo" className="pc-palco-proprio">
            <Confirmacoes />
          </main>
          {sobre}
        </div>
      </ControleDoTopo.Provider>
    );

  if (situacao === "404")
    return (
      <ControleDoTopo.Provider value={controle}>
        <div className="pc-tela">
          <Topo atual={null} />
          <main id="conteudo" className="pc-palco-proprio pc-404">
            <p className="pc-404-codigo mp-mono">/projetos/117-26</p>
            <h1>Esta página não existe.</h1>
            <p className="pc-404-texto">O endereço pode ter sido digitado errado, ou o projeto foi excluído. Excluído, ele continua guardado no histórico, mas some das listas.</p>
            <div className="pc-404-acoes">
              <Botao variante="primary" onClick={() => abrirPaleta("117-26")}>
                <Search size={15} /> Buscar “117-26” <Tecla>Ctrl K</Tecla>
              </Botao>
              <Botao variante="ghost" onClick={() => ir("projetos")}>Ir para Projetos</Botao>
            </div>
          </main>
          {sobre}
        </div>
      </ControleDoTopo.Provider>
    );

  if (situacao === "erro")
    return (
      <ControleDoTopo.Provider value={controle}>
        <div className="pc-tela">
          <Topo atual="Projetos" />
          <main id="conteudo" className="pc-palco-proprio pc-404">
            <p className="pc-404-codigo mp-mono">/projetos/117-25 · o servidor não respondeu</p>
            <h1>Esta página não carregou.</h1>
            <p className="pc-404-texto">Sem conexão com o servidor. Nada foi alterado — tente de novo.</p>
            <div className="pc-404-acoes">
              <Botao variante="primary" onClick={() => ir("projeto", "com-registros")}>
                <RotateCw size={15} /> Tentar de novo
              </Botao>
              <Botao variante="ghost" onClick={() => ir("inicio")}>Ir para o painel</Botao>
            </div>
          </main>
          {sobre}
        </div>
      </ControleDoTopo.Provider>
    );

  if (situacao === "estreita") return <Estreita />;
  if (situacao === "pilula-estreita")
    return (
      <ControleDoTopo.Provider value={controle}>
        <Estreita />
      </ControleDoTopo.Provider>
    );

  return (
    <ControleDoTopo.Provider value={controle}>
      <div className="pc-fundo" id="conteudo">
        <TelaProjeto situacao="com-registros" />
        <div className="pc-gatilhos" role="group" aria-label="Disparar um aviso (só no laboratório)">
          <span>Disparar aviso:</span>
          {(
            [
              ["atribuídos", AVISOS.atribuidos],
              ["copiado", AVISOS.copiado],
              ["parcial", AVISOS.parcial],
              ["não copiou", AVISOS.naoCopiou],
              ["sem conexão", AVISOS.rede],
            ] as const
          ).map(([r, m]) => (
            <button key={r} type="button" className={m.tom === "falha" ? "pc-gatilho--falha" : undefined} onClick={() => avisar(m)}>
              {r}
            </button>
          ))}
        </div>
        {sobre}
      </div>
    </ControleDoTopo.Provider>
  );
}

/**
 * A TELA ESTREITA: o Topo nas larguras em que ele muda (a mesma barra, medida
 * pela caixa), e o portão das telas que não encolhem sem mentir.
 */
function Estreita() {
  const larguras: { px: number; nota: string }[] = [
    { px: 1280, nota: "A navegação inteira cabe na barra." },
    { px: 1100, nota: "Abaixo de 1280, os destinos saem da barra: a marca do Nexo abre o cartão de navegação." },
    { px: 760, nota: "Abaixo de 900, a busca vira o ícone com o atalho." },
    { px: 390, nota: "Telefone: só a marca, a busca, o sino e o avatar." },
  ];
  return (
    <div className="pc-tela pc-estreita">
      {larguras.map((l) => (
        <figure key={l.px} className="pc-moldura-fig">
          <figcaption>
            <b className="ds-num">{l.px}px</b> {l.nota}
          </figcaption>
          <div className="pc-moldura" style={{ width: l.px }}>
            <Topo atual="Projetos" />
            {l.px === 390 && (
              <div className="pc-portao" role="note">
                <p className="pc-portao-titulo">{PORTAO.titulo}</p>
                <p>{PORTAO.texto}</p>
              </div>
            )}
          </div>
        </figure>
      ))}
    </div>
  );
}
