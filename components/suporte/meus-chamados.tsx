"use client";

import { Bug } from "lucide-react";
import { useEffect, useState } from "react";

import { Botao, Selo } from "@/components/ds/basicos";
import { abrirSuporte } from "@/lib/suporte/cliente";
import { formatarProtocolo, NOME_DA_CATEGORIA, NOME_DO_STATUS, type Categoria, type StatusDoChamado } from "@/lib/suporte/comum";

import "./suporte.css";

type Meu = {
  id: string;
  protocolo: number;
  categoria: Categoria;
  status: StatusDoChamado;
  updatedAt: string;
  ultimaResposta: { texto: string; createdAt: string } | null;
};

const TOM = { ABERTO: "decide", EM_ANALISE: "nexo", RESOLVIDO: "ok" } as const;

/* "Meus chamados", no fim da Ajuda: o botão de relatar e o que já foi relatado, com a última resposta. */
export function MeusChamados() {
  const [lista, setLista] = useState<Meu[] | null>(null);
  useEffect(() => {
    fetch("/api/suporte")
      .then((r) => (r.ok ? r.json() : { chamados: [] }))
      .then((j: { chamados: Meu[] }) => setLista(j.chamados))
      .catch(() => setLista([]));
  }, []);
  return (
    <section id="chamados" className="mp-painel sp-meus">
      <header className="sp-meus-cabeca">
        <div>
          <h2>Suporte</h2>
          <p className="sp-sub">Achou um erro, tem uma dúvida ou uma ideia? O print e o caminho até aqui vão junto.</p>
        </div>
        <Botao variante="primary" onClick={() => abrirSuporte()}>
          <Bug size={15} aria-hidden /> Reportar um problema
        </Botao>
      </header>
      {lista && lista.length > 0 && (
        <ul className="sp-meus-lista">
          {lista.map((c) => (
            <li key={c.id}>
              <span className="mp-mono">{formatarProtocolo(c.protocolo)}</span>
              <span>{NOME_DA_CATEGORIA[c.categoria]}</span>
              <Selo tom={TOM[c.status]} ponto>
                {NOME_DO_STATUS[c.status]}
              </Selo>
              <span className="sp-sub sp-meus-resposta">{c.ultimaResposta ? c.ultimaResposta.texto : "Sem resposta ainda."}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
