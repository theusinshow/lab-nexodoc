"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";

import { ControleDoTopo, Topo } from "../_comum/topo";
import { TelaProjeto } from "../projeto/tela-projeto";
import { Confirmacoes } from "./confirmacoes";
import { AVISO_FALHA, AVISO_LINK, AVISO_OK, PORTAO } from "./dados";
import { Atalhos, Avisos, Paleta, type Aviso } from "./sobreposicoes";
import "./pecas.css";
import "../admin/pessoas-banco.css";

/*
 * AS PEÇAS DE TODA TELA. As sobreposições aparecem por cima da tela de
 * Projeto aprovada (é ela que está no fundo, de verdade, com o Topo ligado):
 * Ctrl K abre a paleta, ? abre os atalhos, o avatar abre o menu da conta. A
 * confirmação, a página que não existe e a tela estreita têm palco próprio.
 */

export type SituacaoPecas = "paleta" | "atalhos" | "aviso" | "menu" | "confirmacao" | "404" | "estreita";

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
          { id: 1, tom: "falha", texto: AVISO_FALHA },
          { id: 2, tom: "ok", texto: AVISO_OK },
        ]
      : [],
  );

  const abrirPaleta = useCallback((q = "") => (setAtalhos(false), setPaleta({ q })), []);
  const abrirAtalhos = useCallback(() => (setPaleta(null), setAtalhos(true)), []);
  const fecharAviso = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);

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
      <Avisos avisos={avisos} onFechar={fecharAviso} />
    </>
  );
  const controle = { onBusca: () => abrirPaleta(), onAtalhos: abrirAtalhos, menuAbertoInicial: situacao === "menu" };

  if (situacao === "confirmacao")
    return (
      <ControleDoTopo.Provider value={controle}>
        <div className="pc-tela">
          <Topo atual="Projetos" />
          <main className="pc-palco-proprio">
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
          <main className="pc-palco-proprio pc-404">
            <p className="pc-404-codigo mp-mono">/projetos/117-26</p>
            <h1>Esta página não existe.</h1>
            <p className="pc-404-texto">O endereço pode ter sido digitado errado, ou o projeto foi excluído. Excluído, ele continua guardado no histórico, mas some das listas.</p>
            <div className="pc-404-acoes">
              <Botao variante="primary" onClick={() => abrirPaleta("117-26")}>
                <Search size={15} /> Buscar “117-26” <Tecla>Ctrl K</Tecla>
              </Botao>
              <Botao variante="ghost">Ir para Projetos</Botao>
            </div>
          </main>
          {sobre}
        </div>
      </ControleDoTopo.Provider>
    );

  if (situacao === "estreita") return <Estreita />;

  return (
    <ControleDoTopo.Provider value={controle}>
      <div className="pc-fundo">
        <TelaProjeto situacao="com-registros" />
        <div className="pc-gatilhos" role="group" aria-label="Disparar um aviso (só no laboratório)">
          <span>Disparar aviso:</span>
          <button type="button" onClick={() => setAvisos((a) => [...a, { id: Date.now(), tom: "ok", texto: AVISO_LINK }])}>
            sucesso
          </button>
          <button type="button" onClick={() => setAvisos((a) => [...a, { id: Date.now(), tom: "falha", texto: AVISO_FALHA }])}>
            falha
          </button>
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
    { px: 1100, nota: "Abaixo de 1280, os destinos vão para o menu da conta (a regra do app)." },
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
