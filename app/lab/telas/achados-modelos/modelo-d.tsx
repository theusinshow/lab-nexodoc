"use client";

/**
 * MODELO D — "Quadro por situação".
 *
 * Quatro colunas: Sem dono · Com alguém · Corrigidos · Encerrados. A situação
 * deixa de ser filtro e vira ESPAÇO: dá para ver de relance onde o trabalho está
 * parado e com quem. O achado abre numa GAVETA à direita, que cobre só parte do
 * quadro — as colunas continuam à vista.
 */
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useState } from "react";

import { Avatar, Botao } from "@/components/ds/basicos";
import { SeloDaDisciplina } from "@/components/telas/comum/disciplina";
import type { AchadoDaTela } from "@/components/telas/resultado/use-parecer-vivo";

import {
  AbasDoAchado,
  AcoesDoAchado,
  AcoesRapidas,
  BarraDeSelecao,
  BotaoDeExibicao,
  Busca,
  CabecaDoAchado,
  FaixasDoAchado,
  Faltou,
  Marcar,
  Notificar,
  PainelDeExibicao,
  Partes,
  Previa,
  Responsavel,
  SugestoesDaIA,
} from "@/components/telas/resultado/fila-a/pecas";
import { iniciais, type Fila } from "@/components/telas/resultado/fila-a/use-fila";

const COLUNAS: { id: string; nome: string; dica: string; entra: (a: AchadoDaTela) => boolean }[] = [
  { id: "sem", nome: "Sem dono", dica: "ninguém pegou ainda", entra: (a) => !a.desfecho && !a.responsavel },
  { id: "com", nome: "Com alguém", dica: "atribuídos, esperando correção", entra: (a) => !a.desfecho && Boolean(a.responsavel) },
  { id: "corrigidos", nome: "Corrigidos", dica: "resolvidos no documento", entra: (a) => a.desfecho?.tipo === "FIXED_IN_DOC" },
  { id: "encerrados", nome: "Encerrados", dica: "decisão técnica ou falso positivo", entra: (a) => Boolean(a.desfecho) && a.desfecho?.tipo !== "FIXED_IN_DOC" },
];

function Cartao({ f, a, onAbrir }: { f: Fila; a: AchadoDaTela; onAbrir: () => void }) {
  const ativo = a.chave === f.atual?.chave;
  return (
    <div className={`am-d-cartao${ativo ? " am-d-cartao--ativo" : ""}${a.desfecho?.tipo === "FIXED_IN_DOC" ? " am-d-cartao--ok" : ""}`}>
      <div className="am-d-cartao-topo">
        <Marcar f={f} a={a} />
        <span className="rs-linha-id">{a.id}</span>
        <i className={`rs-ponto rs-ponto--${a.nivel}`} />
        <SeloDaDisciplina disc={a.disc} />
        <AcoesRapidas f={f} a={a} />
      </div>
      <button type="button" className="am-d-cartao-corpo" onClick={onAbrir}>
        <b>{a.titulo}</b>
        <span className="am-d-cartao-pe">
          {a.paginas.length > 0 && <span className="ds-num">p. {a.paginas.slice(0, 3).join(", ")}{a.paginas.length > 3 ? "…" : ""}</span>}
          {a.comentarios > 0 && <span className="rs-linha-conversa ds-num">{a.comentarios}</span>}
          {a.responsavel && (
            <span className="am-d-dono">
              <Avatar iniciais={iniciais(a.responsavel.nome)} pequeno /> {a.responsavel.souEu ? "você" : a.responsavel.nome.split(" ")[0]}
            </span>
          )}
          {a.desfecho?.por && <span className="am-d-dono">por {a.desfecho.por.split(" ")[0]}</span>}
        </span>
      </button>
    </div>
  );
}

export function ModeloD({ f }: { f: Fila }) {
  const [exibicao, setExibicao] = useState(false);
  const [gaveta, setGaveta] = useState(false);
  const [soMeus, setSoMeus] = useState(false);
  const a = f.atual;
  const base = soMeus ? f.filtrados.filter((x) => x.meu || x.responsavel?.souEu) : f.filtrados;

  return (
    <div className={`am-d${gaveta ? " am-d--com-gaveta" : ""}`}>
      <div className="am-d-topo">
        <Busca f={f} />
        <button type="button" className={`fl-botao${soMeus ? " fl-botao--ligado" : ""}`} aria-pressed={soMeus} onClick={() => setSoMeus(!soMeus)}>
          Só os meus
        </button>
        <BotaoDeExibicao f={f} aberto={exibicao} onTroca={() => setExibicao(!exibicao)} rotulo="Filtros" />
        <Notificar f={f} compacto />
        <BarraDeSelecao f={f} flutuante={false} />
      </div>
      <PainelDeExibicao f={f} aberto={exibicao} />

      <div className="am-d-quadro">
        {COLUNAS.map((c) => {
          const itens = base.filter(c.entra);
          return (
            <section key={c.id} className={`am-d-coluna am-d-coluna--${c.id}`} aria-label={c.nome}>
              <header>
                <b>{c.nome}</b>
                <span className="ds-num">{itens.length}</span>
                <small>{c.dica}</small>
              </header>
              <div className="am-rolagem">
                {itens.map((x) => (
                  <Cartao key={x.chave} f={f} a={x} onAbrir={() => (f.abrir(x.chave), setGaveta(true))} />
                ))}
                {itens.length === 0 && <p className="am-d-vazia">Nada aqui.</p>}
              </div>
            </section>
          );
        })}

        <AnimatePresence>
          {gaveta && a && (
            <motion.aside className="am-d-gaveta" aria-label={`Achado ${a.id}`} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}>
              <div className="am-d-gaveta-topo">
                <CabecaDoAchado f={f} a={a} navegar={false} />
                <Botao variante="quiet" tamanho="sm" icone aria-label="Fechar o achado" onClick={() => setGaveta(false)}>
                  <X />
                </Botao>
              </div>
              <div className="am-rolagem" key={a.chave}>
                <h2>{a.titulo}</h2>
                <FaixasDoAchado f={f} a={a} compacta />
                <Responsavel f={f} a={a} />
                <Previa f={f} a={a} />
                <Partes f={f} a={a} />
                <AbasDoAchado f={f} a={a} />
              </div>
              <footer className="am-d-gaveta-pe">
                <AcoesDoAchado f={f} a={a} compacta />
              </footer>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <div className="am-d-rodape">
        <SugestoesDaIA f={f} />
        <Faltou f={f} />
      </div>
    </div>
  );
}
