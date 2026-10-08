"use client";

/**
 * A OBRA CORRIGIDA NO CHAT, LEVADA AO CADASTRO — só com o sim de alguém.
 *
 * Teste real de 08/10/2026: um colega anexou um memorial com o nome da obra
 * errado de propósito, corrigiu na ficha, e a aba Projetos continuou com o nome
 * errado. Não era defeito: o nome do projeto é gravado na criação e nenhum
 * documento o sobrescreve, porque o cadastro vale mais do que a leitura de um
 * PDF. Só que uma correção feita por uma PESSOA não é leitura de PDF — e quem
 * corrige espera ver a mudança no projeto.
 *
 * A regra fica de pé: nada muda sozinho. O Nexo compara a obra corrigida com o
 * cadastro e, se divergem, pergunta.
 *
 * Some quando não há o que perguntar: conversa sem projeto vinculado, cadastro
 * que já diz o mesmo, ou uma correção posterior da obra que tornou esta velha.
 */
import { useEffect, useState } from "react";

import { Botao } from "@/components/ds/basicos";

import { useConversation } from "../state/conversation-store";
import { esquecerResumo } from "../state/use-cartoes-de-projeto";
import type { NexoChatMessage } from "../types";

/** Caixa e espaço não são divergência: "Ginásio  Municipal" é "GINÁSIO MUNICIPAL". */
function mesmoNome(a: string, b: string): boolean {
  const norma = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
  return norma(a) === norma(b);
}

export function CadastroDaObraCard({
  mensagemId,
  oferta,
}: {
  mensagemId: string;
  oferta: NonNullable<NexoChatMessage["cadastroDaObra"]>;
}) {
  const { projectId, identidade, atualizarMensagem } = useConversation();
  const [cadastrado, setCadastrado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  /* Uma correção da obra feita depois desta é a que vale; esta se cala. */
  const vigente = !identidade.obra || mesmoNome(identidade.obra, oferta.para);
  const perguntar = oferta.estado === "pendente" && Boolean(projectId) && vigente;

  useEffect(() => {
    if (!perguntar || !projectId) return;
    let vivo = true;
    fetch(`/api/projects/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((dados: { project?: { name?: string } } | null) => {
        if (vivo) setCadastrado(dados?.project?.name ?? null);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [perguntar, projectId]);

  if (oferta.estado === "atualizado") {
    return (
      <p className="nx-cadastro nx-cadastro--feito" role="status">
        Cadastro do projeto atualizado para “{oferta.para}”.
      </p>
    );
  }
  if (!perguntar || cadastrado === null || mesmoNome(cadastrado, oferta.para)) return null;

  async function atualizar() {
    setEnviando(true);
    setErro("");
    try {
      const resposta = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: oferta.para }),
      });
      const dados = (await resposta.json().catch(() => null)) as { error?: string } | null;
      if (!resposta.ok) throw new Error(dados?.error ?? "Não foi possível atualizar o cadastro.");
      // A barra lateral lê o nome do projeto no resumo: a próxima montagem busca de novo.
      esquecerResumo();
      atualizarMensagem(mensagemId, { cadastroDaObra: { ...oferta, estado: "atualizado" } });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível atualizar o cadastro.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="nx-cadastro" aria-label="Cadastro do projeto">
      <p className="nx-cadastro-texto">
        O cadastro do projeto ainda diz “{cadastrado}”. Atualizar para “{oferta.para}”?
      </p>
      <div className="nx-cadastro-acoes">
        <Botao variante="primary" tamanho="sm" disabled={enviando} onClick={atualizar}>
          {enviando ? "Atualizando…" : "Atualizar cadastro"}
        </Botao>
        <Botao
          variante="quiet"
          tamanho="sm"
          disabled={enviando}
          onClick={() => atualizarMensagem(mensagemId, { cadastroDaObra: { ...oferta, estado: "mantido" } })}
        >
          Manter
        </Botao>
      </div>
      {erro && (
        <p className="nx-cadastro-erro" role="alert">
          {erro}
        </p>
      )}
    </section>
  );
}
