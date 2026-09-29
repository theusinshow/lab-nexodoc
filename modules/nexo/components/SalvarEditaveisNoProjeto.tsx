"use client";

/**
 * PASSO 2 DO VOLUME: salvar capa, LD e separatriz (ODT) na pasta do projeto.
 *
 * É o que destrava o PDF do volume. O editável é o que se conserta à mão no
 * LibreOffice; se ele não chega na pasta, some com o navegador que o gerou.
 * Ver docs/superpowers/specs/2026-09-29-editaveis-na-pasta-design.md.
 *
 * A ORDEM IMPORTA no clique: o seletor de pasta abre ANTES de gerar os ODTs.
 * O navegador só abre o seletor colado ao gesto do usuário, e as três idas ao
 * gerador comem esse prazo.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FolderDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SeloForLd } from "@/server/nexo/build-ld-proposal";
import { useConversation } from "../state/conversation-store";
import { useLiberacaoDoVolume } from "../state/use-liberacao-do-volume";
import { baixarEditaveis, editaveisDosResultados, type Editavel } from "../lib/editaveis";
import { gerarEditaveisConsolidados, parametrosDaEntrega } from "../lib/editaveis-consolidados";
import { assinaturaDosDocumentos } from "../lib/editaveis-no-projeto";
import {
  escolherPasta,
  foiCancelado,
  gravarNaPasta,
  lembrarPasta,
  pastaLembrada,
  suportaGravarEmPasta,
  temPermissaoDeEscrita,
  type DecisaoDeConflito,
} from "../lib/gravar-na-pasta";
import { formatarDataHora } from "@/lib/fuso-de-brasilia";

const semAssinatura = () => () => {};

type Conflito = { nome: string; responder: (d: DecisaoDeConflito) => void };

export function SalvarEditaveisNoProjeto({ selos }: { selos: SeloForLd[] }) {
  const {
    results,
    identidade,
    projectId,
    conversationId,
    editaveisSalvos,
    registrarEditaveisSalvos,
  } = useConversation();
  const liberacao = useLiberacaoDoVolume();
  const chave = projectId ?? `conversa:${conversationId}`;

  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [conflito, setConflito] = useState<Conflito | null>(null);
  /*
   * A pasta lembrada é lida na MONTAGEM, não no clique: ler o IndexedDB depois
   * do clique gastaria o prazo do gesto que o seletor exige.
   */
  const [lembrada, setLembrada] = useState<FileSystemDirectoryHandle | null>(null);
  /* No servidor não há `window`: lá é `false`, e o cliente corrige na hidratação. */
  const suporta = useSyncExternalStore(semAssinatura, suportaGravarEmPasta, () => false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    void pastaLembrada(chave).then((p) => montado.current && setLembrada(p));
    return () => {
      montado.current = false;
    };
  }, [chave]);

  /** Os três consolidados, gerados agora a partir do que o volume usou. */
  async function gerar(): Promise<Editavel[]> {
    const { editaveis, falhas } = await gerarEditaveisConsolidados({
      selos,
      params: parametrosDaEntrega(results),
      identidade,
    });
    // Liberar com um editável faltando é liberar o volume que perde a capa
    // editável — exatamente o que a trava existe para impedir.
    if (falhas.length > 0) {
      throw new Error(`Não deu para gerar: ${falhas.join("; ")}. Nada foi salvo.`);
    }
    return editaveis;
  }

  async function salvarNaPasta(usarLembrada: boolean) {
    setErro(null);
    try {
      let pasta: FileSystemDirectoryHandle;
      if (usarLembrada && lembrada && (await temPermissaoDeEscrita(lembrada))) {
        pasta = lembrada;
      } else {
        pasta = await escolherPasta();
      }
      const assinatura = assinaturaDosDocumentos(results);
      setOcupado("Gerando os editáveis…");
      const editaveis = await gerar();
      const arquivos = await Promise.all(
        editaveis.map(async (e) => ({ nome: e.nome, blob: await (await fetch(e.url)).blob() })),
      );
      setOcupado(`Gravando em “${pasta.name}”…`);
      const r = await gravarNaPasta(pasta, arquivos, (nome) =>
        new Promise<DecisaoDeConflito>((responder) => setConflito({ nome, responder })),
      );
      await lembrarPasta(chave, pasta);
      setLembrada(pasta);
      registrarEditaveisSalvos({
        pasta: pasta.name,
        quando: Date.now(),
        modo: "pasta",
        arquivos: [...r.gravados, ...r.pulados],
        assinatura,
      });
    } catch (err) {
      if (!foiCancelado(err)) {
        setErro(err instanceof Error ? err.message : "Falha ao gravar na pasta.");
      }
    } finally {
      setConflito(null);
      setOcupado(null);
    }
  }

  /**
   * A saída de quem não consegue gravar direto (Firefox, disco sem permissão):
   * o ZIP de sempre, com os três consolidados e os por-tomo. Libera também — a
   * palavra do usuário é o que resta quando o navegador não alcança a pasta.
   */
  async function baixarZip() {
    setErro(null);
    try {
      const assinatura = assinaturaDosDocumentos(results);
      setOcupado("Gerando os editáveis…");
      const consolidados = await gerar();
      const todos = [...consolidados, ...editaveisDosResultados(results)];
      await baixarEditaveis(todos, "editaveis-do-volume.zip");
      registrarEditaveisSalvos({
        pasta: "",
        quando: Date.now(),
        modo: "zip",
        arquivos: todos.map((e) => e.nome),
        assinatura,
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao juntar os editáveis.");
    } finally {
      setOcupado(null);
    }
  }

  const salvoAgora = editaveisSalvos && liberacao.liberado;

  return (
    <div className="flex flex-col gap-2" data-prova="salvar-editaveis">
      <p className="text-xs text-muted-foreground">
        Antes de baixar o volume, salve a capa, a LD e a separatriz editáveis (ODT) na
        pasta do projeto.
      </p>

      {conflito ? (
        <div className="flex flex-col gap-2" data-prova="conflito-de-nome">
          <p className="text-xs">
            Já existe <span className="font-mono">{conflito.nome}</span> nesta pasta.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => conflito.responder("substituir")}>
              Substituir
            </Button>
            <Button size="sm" variant="outline" onClick={() => conflito.responder("manter")}>
              Manter os dois
            </Button>
            <Button size="sm" variant="outline" onClick={() => conflito.responder("pular")}>
              Pular
            </Button>
          </div>
        </div>
      ) : suporta ? (
        <div className="flex flex-wrap gap-2">
          {lembrada && (
            <Button
              size="sm"
              variant={salvoAgora ? "secondary" : "default"}
              loading={ocupado !== null}
              onClick={() => void salvarNaPasta(true)}
            >
              <FolderDown className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              {ocupado ?? `Salvar em “${lembrada.name}”`}
            </Button>
          )}
          <Button
            size="sm"
            variant={lembrada || salvoAgora ? "outline" : "default"}
            disabled={ocupado !== null}
            onClick={() => void salvarNaPasta(false)}
          >
            {!lembrada && <FolderDown className="mr-1.5 h-3.5 w-3.5" aria-hidden />}
            {!lembrada && ocupado ? ocupado : lembrada ? "Escolher outra pasta" : "Salvar editáveis no projeto"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[var(--status-warning)]">
            Este navegador não grava direto na pasta. Baixe o ZIP e mova os arquivos para a
            pasta do projeto — no Chrome ou no Edge, o Nexo grava sozinho.
          </p>
          <Button size="sm" loading={ocupado !== null} onClick={() => void baixarZip()}>
            {ocupado ?? "Baixar os editáveis (ZIP)"}
          </Button>
        </div>
      )}

      {salvoAgora && editaveisSalvos && (
        <p className="text-xs text-[var(--status-ok)]" data-prova="editaveis-salvos">
          {editaveisSalvos.modo === "pasta"
            ? `Salvos em “${editaveisSalvos.pasta}” em ${formatarDataHora(editaveisSalvos.quando)}: ${editaveisSalvos.arquivos.join(", ")}.`
            : `Baixados em ZIP em ${formatarDataHora(editaveisSalvos.quando)} — confira se foram para a pasta do projeto.`}
        </p>
      )}
      {!salvoAgora && editaveisSalvos && liberacao.motivo && (
        <p className="text-xs text-[var(--status-warning)]">{liberacao.motivo}</p>
      )}

      {erro && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs text-[var(--destructive)]">{erro}</p>
          {suporta && (
            <Button size="sm" variant="outline" disabled={ocupado !== null} onClick={() => void baixarZip()}>
              Baixar em ZIP em vez disso
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
