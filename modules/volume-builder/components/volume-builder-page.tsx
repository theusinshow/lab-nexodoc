"use client";

/**
 * MONTAR VOLUMES COM PDFs EXISTENTES — a mesa manual (auditoria UX/UI,
 * etapas 2 e 3).
 *
 * O estado inteiro mora em `useMesa` (operações puras + histórico + rascunho
 * neste dispositivo). Esta página só organiza as três áreas — Arquivos,
 * Montagem, Conferência — e liga os gestos às operações:
 *
 * - telas largas (≥1536px): as três lado a lado;
 * - notebooks (≥1024px): Arquivos fixo à esquerda; Montagem ou Conferência à
 *   direita, por aba;
 * - celular: uma área por vez, por aba, com rolagem natural da página — nada
 *   de painel com altura zero (V04).
 */

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { FileStack, Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatarEmBrasilia } from "@/lib/fuso-de-brasilia";
import type { ProjectContext } from "@/lib/project-context";
import { cn } from "@/lib/utils";
import {
  adicionarGrupo,
  adicionarVolumeComGrupo,
  aplicarSugestao,
  editarMetadados,
  impactoDoArquivo,
  importarArquivos,
  inserirPaginas,
  prontidaoDaMontagem,
  reclassificarArquivo,
  removerArquivo,
  type AlvoDeInsercao,
  type Pendencia,
} from "@/modules/volume-builder/lib/volume/mesa";
import { createPageAssetsForFile } from "@/modules/volume-builder/lib/volume/page-assets";
import type { ImportedPdfFile, PageAsset } from "@/modules/volume-builder/lib/volume/volume-types";
import { AssemblySuggestionPanel } from "./assembly-suggestion-panel";
import { ImportedFilesPool } from "./imported-files-pool";
import { BarraDaMesa } from "./mesa/barra-da-mesa";
import { ConferenciaDaMontagem } from "./mesa/conferencia-da-mesa";
import { DadosDoVolume } from "./mesa/dados-do-volume";
import { InserirNoDestino, SeletorDeDestino, destinoEfetivo, type Destino } from "./mesa/destino";
import { SaidaDaMesa } from "./mesa/saida-da-mesa";
import { VolumeDaMesa } from "./mesa/volume-da-mesa";
import { PageAssetTray } from "./page-asset-tray";
import { useMesa } from "./use-mesa";
import { VolumeStructurePreview } from "./volume-structure-preview";

const PreviaDoVolume = dynamic(() => import("./mesa/previa-do-volume"), { ssr: false });

type Aba = "arquivos" | "montagem" | "conferencia";
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "arquivos", rotulo: "Arquivos" },
  { id: "montagem", rotulo: "Montagem" },
  { id: "conferencia", rotulo: "Conferência" },
];

export function VolumeBuilderPage({
  email,
  projectContext,
}: {
  email: string;
  projectContext?: ProjectContext | null;
}) {
  const mesa = useMesa({
    email,
    projetoInicial: projectContext?.id ?? null,
    metadadosIniciais: { projectCode: projectContext?.code ?? "", projectName: projectContext?.name ?? "" },
  });
  const { estado, bytes, executar } = mesa;

  const [aba, setAba] = useState<Aba>("arquivos");
  const [selecionadasIds, setSelecionadasIds] = useState<string[]>([]);
  const [destinoEscolhido, setDestinoEscolhido] = useState<Destino | null>(null);
  const [mostrarImportacao, setMostrarImportacao] = useState(true);
  const [previa, setPrevia] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<PageAsset[]>([]);
  const [descartando, setDescartando] = useState(false);
  const retornoDoFoco = useRef<HTMLElement | null>(null);

  const destino = destinoEfetivo(estado, destinoEscolhido);
  const selecionadas = useMemo(
    () =>
      selecionadasIds
        .map((id) => estado.pageAssets.find((a) => a.id === id))
        .filter((a): a is PageAsset => Boolean(a)),
    [selecionadasIds, estado.pageAssets],
  );
  const disponiveis = useMemo(() => new Set(bytes.keys()), [bytes]);
  const prontidao = useMemo(() => prontidaoDaMontagem(estado, { bytesDisponiveis: disponiveis }), [estado, disponiveis]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // ------------------------------------------------------------ gestos

  const inserir = useCallback(
    (alvo: AlvoDeInsercao, assets: PageAsset[] = selecionadas) => {
      executar((s) => inserirPaginas(s, alvo, assets));
    },
    [executar, selecionadas],
  );

  const criarVolume = useCallback(() => {
    // Volume novo já nasce com um grupo e vira o destino: é o passo seguinte
    // de quem acabou de pedir um volume.
    const r = executar((s) => adicionarVolumeComGrupo(s));
    const novo = r.estado.rows.at(-1);
    if (novo) setDestinoEscolhido({ rowId: novo.id, blockId: novo.blocks[0]?.id ?? null, posicao: null });
  }, [executar]);

  function aoImportar(files: ImportedPdfFile[], dados: File[]) {
    mesa.guardarBytes(new Map(files.map((f, i) => [f.id, dados[i]])));
    executar((s) => importarArquivos(s, files, files.flatMap((f) => createPageAssetsForFile(f))));
  }

  function irPara(p: Pendencia) {
    setAba("montagem");
    if (p.alvo.blockId) setDestinoEscolhido({ rowId: p.alvo.rowId, blockId: p.alvo.blockId, posicao: null });
    requestAnimationFrame(() => {
      const el = document.getElementById(p.alvo.blockId ? `grupo-${p.alvo.blockId}` : `volume-${p.alvo.rowId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    });
  }

  function abrirPrevia(rowId: string) {
    retornoDoFoco.current = document.activeElement as HTMLElement | null;
    setPrevia(rowId);
  }

  function fecharPrevia() {
    setPrevia(null);
    requestAnimationFrame(() => retornoDoFoco.current?.focus());
  }

  // ------------------------------------------------------------ arrastar (atalho)

  function arrastadas(activeId: string) {
    const ids = selecionadasIds.includes(activeId) ? selecionadasIds : [activeId];
    return ids.map((id) => estado.pageAssets.find((a) => a.id === id)).filter((a): a is PageAsset => Boolean(a));
  }

  function aoSoltar(ev: DragEndEvent) {
    setArrastando([]);
    const over = typeof ev.over?.id === "string" ? ev.over.id : null;
    if (!over) return;
    const assets = arrastadas(String(ev.active.id));
    const [tipo, id, indice] = over.split(":");
    const rowDoGrupo = (blockId: string) => estado.rows.find((r) => r.blocks.some((b) => b.id === blockId))?.id;
    let alvo: AlvoDeInsercao | null = null;
    if (tipo === "cover") alvo = { tipo: "cover", rowId: id };
    else if (tipo === "ld" || tipo === "separator") {
      const rowId = rowDoGrupo(id);
      if (rowId) alvo = { tipo, rowId, blockId: id };
    } else if (tipo === "documents" || tipo === "appendices") {
      const rowId = rowDoGrupo(id);
      if (rowId) alvo = { tipo: tipo === "documents" ? "document" : "appendix", rowId, blockId: id };
    } else if (tipo === "document-item" || tipo === "appendix-item") {
      // Soltar SOBRE um item insere ANTES dele — nunca apaga o que estava ali.
      const rowId = rowDoGrupo(id);
      if (rowId) alvo = { tipo: tipo === "document-item" ? "document" : "appendix", rowId, blockId: id, posicao: Number(indice) };
    }
    if (alvo) inserir(alvo, assets);
  }

  function teclasDasAbas(e: KeyboardEvent<HTMLDivElement>) {
    const i = ABAS.findIndex((a) => a.id === aba);
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const proxima = ABAS[(i + (e.key === "ArrowRight" ? 1 : ABAS.length - 1)) % ABAS.length];
    setAba(proxima.id);
    requestAnimationFrame(() => document.getElementById(`aba-${proxima.id}`)?.focus());
  }

  const r = mesa.recuperacao;

  return (
    <div className="flex max-w-full flex-col gap-3">
      <BarraDaMesa
        mesa={mesa}
        projetoInicial={projectContext ? { id: projectContext.id, code: projectContext.code, name: projectContext.name } : null}
      />

      {r ? (
        <section
          role="status"
          data-rascunho-recuperado
          className="flex flex-wrap items-start gap-2 border border-[var(--signal-info-border)] bg-[var(--signal-info-bg)] px-3 py-2 text-sm"
        >
          <span className="min-w-0 flex-1">
            Montagem recuperada deste dispositivo (salva às{" "}
            {formatarEmBrasilia(new Date(r.em).toISOString(), { dateStyle: "short", timeStyle: "short" })}).
            {r.faltando.length > 0 ? (
              <span className="block text-[var(--status-critical)]">
                Sem conteúdo guardado: {r.faltando.join(", ")}. Importe de novo para exportar.
              </span>
            ) : null}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={mesa.fecharRecuperacao}>
            Continuar
          </Button>
          {descartando ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => {
                setDescartando(false);
                void mesa.descartar();
              }}
            >
              Confirmar: apagar o rascunho deste dispositivo
            </Button>
          ) : (
            <Button type="button" size="sm" variant="ghost" onClick={() => setDescartando(true)}>
              Descartar e começar nova
            </Button>
          )}
        </section>
      ) : null}

      <DadosDoVolume
        metadata={estado.metadata}
        onChange={(m) => executar((s) => editarMetadados(s, m), { chave: "metadados" })}
      />

      <div role="tablist" aria-label="Áreas da mesa" className="flex gap-1 border-b 2xl:hidden" onKeyDown={teclasDasAbas}>
        {ABAS.map((a) => (
          <button
            key={a.id}
            id={`aba-${a.id}`}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            aria-controls={`area-${a.id}`}
            tabIndex={aba === a.id ? 0 : -1}
            onClick={() => setAba(a.id)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
              aba === a.id ? "border-[var(--primary)] text-foreground" : "border-transparent text-muted-foreground",
              a.id === "arquivos" && "lg:hidden",
            )}
          >
            {a.rotulo}
            {a.id === "arquivos" ? ` (${estado.importedFiles.length})` : a.id === "montagem" ? ` (${estado.rows.length})` : prontidao.bloqueios ? ` (${prontidao.bloqueios})` : ""}
          </button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={(ev: DragStartEvent) => setArrastando(arrastadas(String(ev.active.id)))}
        onDragCancel={() => setArrastando([])}
        onDragEnd={aoSoltar}
      >
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[22rem_minmax(0,1fr)] 2xl:grid-cols-[22rem_minmax(0,1fr)_22rem]">
          <section
            id="area-arquivos"
            role="tabpanel"
            aria-labelledby="aba-arquivos"
            aria-label="Arquivos"
            className={cn(
              "min-w-0 space-y-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1",
              aba === "arquivos" ? "block" : "hidden",
              "lg:block",
            )}
          >
            {mostrarImportacao ? (
              <ImportedFilesPool
                files={estado.importedFiles}
                fileDataMap={bytes as Map<string, File>}
                onFilesImported={aoImportar}
                onRemoveFile={(id) => executar((s) => removerArquivo(s, id))}
                onReclassify={(id, papel) => executar((s) => reclassificarArquivo(s, id, papel))}
                impactoDe={(id) => impactoDoArquivo(estado, id)}
                onCollapse={() => setMostrarImportacao(false)}
              />
            ) : (
              <Button type="button" variant="outline" size="sm" className="w-full justify-start" onClick={() => setMostrarImportacao(true)}>
                <Upload aria-hidden />
                Mostrar importação ({estado.importedFiles.length} arquivos)
              </Button>
            )}
            <PageAssetTray
              assets={estado.pageAssets}
              fileDataMap={bytes as Map<string, File>}
              selectedAssetIds={selecionadasIds}
              onSelectedAssetIdsChange={setSelecionadasIds}
              onAssetsChange={mesa.ajustarPaginas}
              renderAcoes={(sel) => (
                <div className="space-y-2">
                  <SeletorDeDestino
                    estado={estado}
                    destino={destino}
                    onChange={setDestinoEscolhido}
                    onCriarVolume={criarVolume}
                    onCriarGrupo={(rowId) => {
                      const g = executar((s) => adicionarGrupo(s, rowId));
                      const novo = g.estado.rows.find((x) => x.id === rowId)?.blocks.at(-1);
                      if (novo) setDestinoEscolhido({ rowId, blockId: novo.id, posicao: null });
                    }}
                  />
                  <InserirNoDestino estado={estado} destino={destino} quantidade={sel.length} onInserir={(alvo) => inserir(alvo, sel)} />
                </div>
              )}
            />
          </section>

          <section
            id="area-montagem"
            role="tabpanel"
            aria-labelledby="aba-montagem"
            aria-label="Montagem"
            className={cn(
              "min-w-0 space-y-3",
              aba === "montagem" ? "block" : "hidden",
              aba === "conferencia" ? "lg:hidden" : "lg:block",
              "2xl:block",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <div>
                <h2 className="text-base font-semibold">Montagem</h2>
                <p className="text-xs text-muted-foreground">
                  Projeto → Volumes → Grupos (separatriz, LD, pranchas, anexos). A ordem na tela é a ordem do PDF.
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={criarVolume}>
                <Plus aria-hidden />
                Adicionar volume
              </Button>
            </div>

            <AssemblySuggestionPanel
              metadata={estado.metadata}
              importedFiles={estado.importedFiles}
              pageAssets={estado.pageAssets}
              onApplySuggestion={(s) => executar((e) => aplicarSugestao(e, s))}
            />

            {estado.rows.length === 0 ? (
              <div className="border border-dashed p-8 text-center">
                <FileStack className="mx-auto size-5 text-muted-foreground" aria-hidden />
                <p className="mt-2 text-sm text-muted-foreground">Nenhum volume ainda.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use &quot;Adicionar volume&quot;. O volume nasce com um grupo e vira o destino das páginas selecionadas.
                </p>
              </div>
            ) : (
              estado.rows.map((row, i) => (
                <VolumeDaMesa
                  key={row.id}
                  estado={estado}
                  row={row}
                  indice={i}
                  prontidao={prontidao.volumes.find((v) => v.rowId === row.id)!}
                  destino={destino}
                  selecionadas={selecionadas}
                  executar={executar}
                  onDestino={setDestinoEscolhido}
                  onPrevia={abrirPrevia}
                />
              ))
            )}
          </section>

          <section
            id="area-conferencia"
            role="tabpanel"
            aria-labelledby="aba-conferencia"
            aria-label="Conferência"
            className={cn(
              "min-w-0 space-y-3 2xl:sticky 2xl:top-24 2xl:max-h-[calc(100vh-7rem)] 2xl:self-start 2xl:overflow-y-auto",
              aba === "conferencia" ? "block" : "hidden",
              aba === "conferencia" ? "lg:block lg:col-start-2" : "lg:hidden",
              "2xl:col-start-3 2xl:block",
            )}
          >
            <ConferenciaDaMontagem
              estado={estado}
              prontidao={prontidao}
              assinatura={mesa.assinatura}
              conferencia={mesa.conferencia}
              onConferido={mesa.registrarConferencia}
              onIrPara={irPara}
            />
            <SaidaDaMesa
              estado={estado}
              bytes={bytes}
              prontidao={prontidao}
              assinatura={mesa.assinatura}
              conferencia={mesa.conferencia}
              projetoId={mesa.projetoId}
              onPrevia={abrirPrevia}
            />
            <VolumeStructurePreview rows={estado.rows} metadata={estado.metadata} compact />
          </section>
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
          {arrastando.length > 0 ? (
            <div className="pointer-events-none w-56 border bg-[var(--nexodoc-panel)] p-2 text-xs shadow-lg">
              {arrastando.length > 1 ? `${arrastando.length} páginas` : `${arrastando[0].sourceFileName} p. ${arrastando[0].pageNumber}`}
              <span className="block text-muted-foreground">Solte num lugar da montagem</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {previa ? <PreviaDoVolume estado={estado} bytes={bytes} rowIdInicial={previa} onFechar={fecharPrevia} /> : null}
    </div>
  );
}
