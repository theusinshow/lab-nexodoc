"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, MouseEvent, ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Document, Page, pdfjs } from "react-pdf";
import type { PageAsset, PageAssetRole } from "@/modules/volume-builder/lib/volume/volume-types";
import { plural } from "@/lib/plural";
import { classifyPageAsset } from "@/modules/volume-builder/lib/volume/page-classification";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Eye,
  FileStack,
  GripVertical,
  Layers3,
  Maximize2,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// O worker precisa casar com o pdfjs aninhado do react-pdf (5.4.296), NÃO o
// engine do selo (5.7.284) — senão "API version does not match Worker version"
// e nada renderiza. Usa a cópia do worker do próprio react-pdf.
pdfjs.GlobalWorkerOptions.workerSrc = "/assets/pdfjs/pdf.worker.react-pdf.mjs";

interface PageAssetTrayProps {
  assets: PageAsset[];
  fileDataMap: Map<string, File>;
  selectedAssetIds: string[];
  onSelectedAssetIdsChange: (ids: string[]) => void;
  onAssetsChange: (assets: PageAsset[]) => void;
  /**
   * O que fazer com as páginas selecionadas — o destino explícito e os botões
   * "Adicionar como…" (V03). Antes eram três botões fixos que iam sempre para
   * o primeiro volume e o primeiro grupo.
   */
  renderAcoes: (selecionadas: PageAsset[]) => ReactNode;
}

type PreviewTarget = {
  asset: PageAsset;
  file?: File;
  fileUrl?: string;
};

export default function PageAssetTrayInternal({
  assets,
  fileDataMap,
  selectedAssetIds,
  onSelectedAssetIdsChange,
  onAssetsChange,
  renderAcoes,
}: PageAssetTrayProps) {
  const [query, setQuery] = useState("");
  const [activeFileId, setActiveFileId] = useState<string>("all");
  const [activeRole, setActiveRole] = useState<PageAssetRole | "all">("all");
  const [activeDiscipline, setActiveDiscipline] = useState<string>("all");
  const [activeBlock, setActiveBlock] = useState<string>("all");
  const [showReviewOnly, setShowReviewOnly] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [zoomAssetId, setZoomAssetId] = useState<string | null>(null);
  /*
   * UMA URL `blob:` POR ARQUIVO, estável enquanto o arquivo existir. Antes, a
   * lista era recriada a cada mudança das páginas (os resumos chegam aos
   * poucos) e o efeito revogava as URLs antigas com o visor ainda lendo uma
   * delas: "Unexpected server response (0)" e a prévia caía no iframe.
   */
  const [fileObjectUrls, setFileObjectUrls] = useState<Map<string, string>>(new Map());
  const urlsPorArquivo = useRef(new Map<string, { file: File; url: string }>());
  useEffect(() => {
    const m = urlsPorArquivo.current;
    let mudou = false;
    for (const [id, file] of fileDataMap) {
      const e = m.get(id);
      if (e?.file === file) continue;
      if (e) URL.revokeObjectURL(e.url);
      m.set(id, { file, url: URL.createObjectURL(file) });
      mudou = true;
    }
    for (const [id, e] of m) {
      if (fileDataMap.has(id)) continue;
      URL.revokeObjectURL(e.url);
      m.delete(id);
      mudou = true;
    }
    if (mudou) {
      const proximo = new Map([...m].map(([id, e]) => [id, e.url] as const));
      queueMicrotask(() => setFileObjectUrls(proximo));
    }
  }, [fileDataMap]);
  useEffect(() => {
    const m = urlsPorArquivo.current;
    return () => {
      for (const e of m.values()) URL.revokeObjectURL(e.url);
      m.clear();
    };
  }, []);

  const files = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const asset of assets) {
      const current = map.get(asset.sourceFileId);
      map.set(asset.sourceFileId, {
        id: asset.sourceFileId,
        name: asset.sourceFileName,
        count: (current?.count ?? 0) + 1,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assets]);

  const roleCounts = useMemo(
    () =>
      ROLE_OPTIONS.map((role) => ({
        ...role,
        count: assets.filter((asset) => getAssetRole(asset) === role.value).length,
      })),
    [assets]
  );

  const disciplineCounts = useMemo(() => getFacetCounts(assets, "disciplineCode"), [assets]);
  const blockCounts = useMemo(() => getFacetCounts(assets, "blockCode"), [assets]);

  const selectedAssets = useMemo(
    () =>
      selectedAssetIds
        .map((id) => assets.find((asset) => asset.id === id))
        .filter((asset): asset is PageAsset => Boolean(asset)),
    [assets, selectedAssetIds]
  );

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesFile = activeFileId === "all" || asset.sourceFileId === activeFileId;
      const matchesRole = activeRole === "all" || getAssetRole(asset) === activeRole;
      const matchesDiscipline =
        activeDiscipline === "all" || asset.classification?.disciplineCode === activeDiscipline;
      const matchesBlock = activeBlock === "all" || asset.classification?.blockCode === activeBlock;
      const matchesReview =
        !showReviewOnly ||
        !asset.classification ||
        asset.classification.confidence < 0.72 ||
        asset.classification.warnings.length > 0;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        asset.sourceFileName.toLowerCase().includes(normalizedQuery) ||
        asset.summary?.toLowerCase().includes(normalizedQuery) ||
        asset.classification?.documentCode?.toLowerCase().includes(normalizedQuery) ||
        asset.classification?.blockCode?.toLowerCase().includes(normalizedQuery) ||
        asset.classification?.disciplineCode?.toLowerCase().includes(normalizedQuery) ||
        String(asset.pageNumber).includes(normalizedQuery);

      return (
        matchesFile &&
        matchesRole &&
        matchesDiscipline &&
        matchesBlock &&
        matchesReview &&
        matchesQuery
      );
    });
  }, [activeBlock, activeDiscipline, activeFileId, activeRole, assets, query, showReviewOnly]);

  const groupedAssets = useMemo(() => {
    const map = new Map<string, PageAsset[]>();
    for (const asset of filteredAssets) {
      const group = map.get(asset.sourceFileId) ?? [];
      group.push(asset);
      map.set(asset.sourceFileId, group);
    }

    return Array.from(map.entries()).map(([fileId, group]) => ({
      fileId,
      fileName: group[0]?.sourceFileName ?? "PDF",
      assets: group.sort((a, b) => a.pageNumber - b.pageNumber),
    }));
  }, [filteredAssets]);

  const previewAsset =
    assets.find((asset) => asset.id === previewAssetId) ??
    selectedAssets[0] ??
    filteredAssets[0];

  const zoomAsset = assets.find((asset) => asset.id === zoomAssetId);

  const previewTarget = previewAsset
    ? createPreviewTarget(previewAsset, fileDataMap, fileObjectUrls)
    : undefined;

  const zoomTarget = zoomAsset
    ? createPreviewTarget(zoomAsset, fileDataMap, fileObjectUrls)
    : undefined;

  useEffect(() => {
    const pendingFileIds = new Set(
      assets.filter((asset) => !asset.summary).map((asset) => asset.sourceFileId)
    );

    if (pendingFileIds.size === 0) {
      return;
    }

    let cancelled = false;

    async function readSummaries() {
      const nextAssets = [...assets];
      let changed = false;

      for (const fileId of pendingFileIds) {
        const file = fileDataMap.get(fileId);
        if (!file) {
          continue;
        }

        try {
          const buffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: buffer }).promise;
          const pages = nextAssets.filter((asset) => asset.sourceFileId === fileId);

          for (const asset of pages) {
            if (asset.summary) {
              continue;
            }

            const page = await pdf.getPage(asset.pageNumber);
            const textContent = await page.getTextContent();
            const text = textContent.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();
            const summary = text.length > 0 ? text.slice(0, 72) : `Pagina ${asset.pageNumber}`;
            const index = nextAssets.findIndex((item) => item.id === asset.id);

            if (index >= 0) {
              const nextAsset = nextAssets[index];
              const classification = classifyPageAsset({
                fileName: nextAsset.sourceFileName,
                pageNumber: nextAsset.pageNumber,
                currentRole: nextAsset.role,
                summary,
                previous: nextAsset.classification,
              });
              nextAssets[index] = {
                ...nextAsset,
                summary,
                role: classification.role === "unknown" ? nextAsset.role : classification.role,
                classification,
              };
              changed = true;
            }
          }
        } catch {
          for (let index = 0; index < nextAssets.length; index++) {
            const asset = nextAssets[index];
            if (asset.sourceFileId === fileId && !asset.summary) {
              nextAssets[index] = { ...asset, summary: `Pagina ${asset.pageNumber}` };
              changed = true;
            }
          }
        }
      }

      if (!cancelled && changed) {
        onAssetsChange(nextAssets);
      }
    }

    void readSummaries();

    return () => {
      cancelled = true;
    };
  }, [assets, fileDataMap, onAssetsChange]);

  function selectAsset(asset: PageAsset, event: MouseEvent<HTMLElement>) {
    setPreviewAssetId(asset.id);

    if (event.shiftKey && lastSelectedId) {
      const lastAsset = assets.find((item) => item.id === lastSelectedId);
      if (lastAsset?.sourceFileId === asset.sourceFileId) {
        const sameFileAssets = assets.filter((item) => item.sourceFileId === asset.sourceFileId);
        const start = sameFileAssets.findIndex((item) => item.id === lastSelectedId);
        const end = sameFileAssets.findIndex((item) => item.id === asset.id);
        if (start >= 0 && end >= 0) {
          const [from, to] = [Math.min(start, end), Math.max(start, end)];
          const rangeIds = sameFileAssets.slice(from, to + 1).map((item) => item.id);
          onSelectedAssetIdsChange(Array.from(new Set([...selectedAssetIds, ...rangeIds])));
          return;
        }
      }
    }

    setLastSelectedId(asset.id);
    if (event.ctrlKey || event.metaKey) {
      onSelectedAssetIdsChange(
        selectedAssetIds.includes(asset.id)
          ? selectedAssetIds.filter((id) => id !== asset.id)
          : [...selectedAssetIds, asset.id]
      );
      return;
    }

    onSelectedAssetIdsChange([asset.id]);
  }

  /** A caixa de cada página: alterna só ela (é o caminho do teclado: Tab + Espaço). */
  function alternarPagina(asset: PageAsset) {
    setPreviewAssetId(asset.id);
    setLastSelectedId(asset.id);
    onSelectedAssetIdsChange(
      selectedAssetIds.includes(asset.id)
        ? selectedAssetIds.filter((id) => id !== asset.id)
        : [...selectedAssetIds, asset.id],
    );
  }

  function alternarArquivo(ids: string[]) {
    const todas = ids.every((id) => selectedAssetIds.includes(id));
    onSelectedAssetIdsChange(
      todas
        ? selectedAssetIds.filter((id) => !ids.includes(id))
        : Array.from(new Set([...selectedAssetIds, ...ids])),
    );
  }

  function handleDragStart(asset: PageAsset, event: DragEvent<HTMLElement>) {
    const ids = selectedAssetIds.includes(asset.id) ? selectedAssetIds : [asset.id];
    event.dataTransfer.setData("application/x-volume-pages", JSON.stringify(ids));
    event.dataTransfer.setData("text/plain", ids.join(","));
    event.dataTransfer.effectAllowed = "copy";
  }

  return (
    <>
      <Card className="flex max-h-full flex-col overflow-hidden">
        <CardHeader className="shrink-0 space-y-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="h-4 w-4" />
              Biblioteca de páginas
            </CardTitle>
            <Badge variant="secondary">{filteredAssets.length}/{assets.length}</Badge>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar arquivo, página, código ou texto"
              aria-label="Buscar páginas por arquivo, número, código ou texto"
              type="search"
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <FilterButton active={activeRole === "all"} onClick={() => setActiveRole("all")}>
              Todos
            </FilterButton>
            {roleCounts.map((role) => (
              <FilterButton
                key={role.value}
                active={activeRole === role.value}
                onClick={() => setActiveRole(role.value)}
              >
                {role.label}
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[11px]">
                  {role.count}
                </Badge>
              </FilterButton>
            ))}
          </div>

          {(disciplineCounts.length > 0 || blockCounts.length > 0) && (
            <div className="space-y-2 rounded-md border bg-muted/15 p-2">
              {disciplineCounts.length > 0 && (
                <FacetButtons
                  label="Disciplina"
                  activeValue={activeDiscipline}
                  options={disciplineCounts}
                  onChange={setActiveDiscipline}
                />
              )}
              {blockCounts.length > 0 && (
                <FacetButtons
                  label="Bloco"
                  activeValue={activeBlock}
                  options={blockCounts}
                  onChange={setActiveBlock}
                />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`h-7 px-2 text-xs ${
                  showReviewOnly
                    ? "border-[var(--nexodoc-tertiary-strong)] bg-[var(--nexodoc-tertiary-bg)] text-[var(--nexodoc-tertiary)]"
                    : ""
                }`}
                onClick={() => setShowReviewOnly((current) => !current)}
              >
                <AlertTriangle className="mr-1 h-3 w-3" />
                Revisar
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 border-t pt-3">
            <FilterButton active={activeFileId === "all"} onClick={() => setActiveFileId("all")}>
              Todos arquivos
            </FilterButton>
            {files.map((file) => (
              <FilterButton
                key={file.id}
                active={activeFileId === file.id}
                onClick={() => setActiveFileId(file.id)}
              >
                <span className="max-w-[180px] truncate">{file.name}</span>
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[11px]">
                  {file.count}
                </Badge>
              </FilterButton>
            ))}
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden">
          {/*
            AS AÇÕES DA SELEÇÃO FICAM SEMPRE À VISTA — com seleção vazia elas
            explicam como selecionar, em vez de sumir (V03/G09).
          */}
          <div className="space-y-2 rounded-md border border-[var(--nexodoc-tertiary-strong)]/45 bg-[var(--nexodoc-tertiary-bg)] p-2">
            {selectedAssetIds.length > 0 ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[var(--nexodoc-tertiary)]" data-selecionadas={selectedAssetIds.length}>
                  {plural(selectedAssetIds.length, "página selecionada", "páginas selecionadas")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onSelectedAssetIdsChange([])}
                >
                  <X className="mr-1 h-3 w-3" aria-hidden />
                  Limpar seleção
                </Button>
              </div>
            ) : null}
            {renderAcoes(selectedAssets)}
          </div>

          <PreviewPanel
            key={`${previewTarget?.asset.id ?? "empty"}:${previewTarget?.fileUrl ?? ""}`}
            target={previewTarget}
            onZoom={() => previewTarget && setZoomAssetId(previewTarget.asset.id)}
          />

          {assets.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center">
              <FileStack className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">
                Importe PDFs para indexar as paginas.
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="space-y-3">
                {groupedAssets.map((group) => (
                  <div key={group.fileId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 border-b pb-1">
                      <p className="truncate text-xs font-medium text-muted-foreground">
                        {group.fileName}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 shrink-0 px-2 text-[11px]"
                        onClick={() => alternarArquivo(group.assets.map((a) => a.id))}
                        aria-label={`${group.assets.every((a) => selectedAssetIds.includes(a.id)) ? "Desmarcar" : "Selecionar"} as ${group.assets.length} páginas listadas de ${group.fileName}`}
                      >
                        {group.assets.every((a) => selectedAssetIds.includes(a.id)) ? "Desmarcar" : "Selecionar"} {group.assets.length} pág.
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {group.assets.map((asset) => (
                        <PageAssetRow
                          key={asset.id}
                          asset={asset}
                          selected={selectedAssetIds.includes(asset.id)}
                          previewing={previewAsset?.id === asset.id}
                          onSelect={selectAsset}
                          onToggle={() => alternarPagina(asset)}
                          onNativeDragStart={handleDragStart}
                          onPreview={() => setPreviewAssetId(asset.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {zoomTarget && (
        <PageZoomOverlay target={zoomTarget} onClose={() => setZoomAssetId(null)} />
      )}
    </>
  );
}

const ROLE_OPTIONS: Array<{ value: PageAssetRole; label: string }> = [
  { value: "cover", label: "Capas" },
  { value: "ld", label: "LDs" },
  { value: "separator", label: "Separatrizes" },
  { value: "document", label: "Pranchas" },
  { value: "appendix", label: "Anexos" },
];

const ROLE_LABELS: Record<PageAssetRole, string> = {
  cover: "Capa",
  ld: "LD",
  separator: "Sep.",
  document: "Prancha",
  appendix: "Anexo",
};

function createPreviewTarget(
  asset: PageAsset,
  fileDataMap: Map<string, File>,
  fileObjectUrls: Map<string, string>
): PreviewTarget {
  return {
    asset,
    file: fileDataMap.get(asset.sourceFileId),
    fileUrl: fileObjectUrls.get(asset.sourceFileId),
  };
}

function getFacetCounts(assets: PageAsset[], field: "disciplineCode" | "blockCode") {
  const counts = new Map<string, number>();

  for (const asset of assets) {
    const value = asset.classification?.[field];
    if (!value) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

function getAssetRole(asset: PageAsset): PageAssetRole {
  return asset.classification?.role && asset.classification.role !== "unknown"
    ? asset.classification.role
    : asset.role ?? "document";
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`h-7 px-2 text-xs ${
        active
          ? "border-[var(--nexodoc-tertiary-strong)] bg-[var(--nexodoc-tertiary-bg)] text-[var(--nexodoc-tertiary)]"
          : ""
      }`}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function FacetButtons({
  label,
  activeValue,
  options,
  onChange,
}: {
  label: string;
  activeValue: string;
  options: Array<{ value: string; count: number }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <FilterButton active={activeValue === "all"} onClick={() => onChange("all")}>
          Todos
        </FilterButton>
        {options.map((option) => (
          <FilterButton
            key={option.value}
            active={activeValue === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.value}
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[11px]">
              {option.count}
            </Badge>
          </FilterButton>
        ))}
      </div>
    </div>
  );
}

function PageAssetRow({
  asset,
  selected,
  previewing,
  onSelect,
  onToggle,
  onNativeDragStart,
  onPreview,
}: {
  asset: PageAsset;
  selected: boolean;
  previewing: boolean;
  onSelect: (asset: PageAsset, event: MouseEvent<HTMLElement>) => void;
  onToggle: () => void;
  onNativeDragStart: (asset: PageAsset, event: DragEvent<HTMLElement>) => void;
  onPreview: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: asset.id,
    data: { type: "page-asset", asset },
  });
  const role = getAssetRole(asset);
  const classification = asset.classification;
  const confidence = classification?.confidence ?? 0;
  const detail = [
    classification?.disciplineCode,
    classification?.blockCode ? `Bloco ${classification.blockCode}` : undefined,
    classification?.documentCode,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.55 : 1,
      }}
      draggable
      onClick={(event) => onSelect(asset, event)}
      onDragStart={(event) => onNativeDragStart(asset, event)}
      data-pagina={asset.id}
      className={`group grid cursor-grab grid-cols-[auto_34px_minmax(0,1fr)_auto] items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-[border-color,background-color,opacity] active:cursor-grabbing ${
        selected
          ? "border-[var(--nexodoc-tertiary-strong)] bg-[var(--nexodoc-tertiary-bg)]"
          : previewing
            ? "border-primary/50 bg-muted/35"
            : "border-border bg-background hover:border-primary/50 hover:bg-muted/25"
      }`}
      {...listeners}
      /*
       * Os `attributes` do dnd-kit tornavam a LINHA focável (tabIndex 0, role
       * "button") sem nome e sem ação no Enter. O foco agora vai para a caixa
       * de seleção, que tem nome e responde ao Espaço (V03/G09).
       */
      aria-roledescription={attributes["aria-roledescription"]}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label={`Selecionar página ${asset.pageNumber} de ${asset.sourceFileName}`}
        className="size-4 accent-[var(--primary)]"
      />
      <div className="flex h-8 items-center justify-center rounded border bg-muted/30 font-mono text-[11px]" aria-hidden>
        {asset.pageNumber}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <Badge variant="outline" className="h-4 px-1 text-[11px]">
            {ROLE_LABELS[role]}
          </Badge>
          {classification && (
            <Badge
              variant="outline"
              className={`h-4 px-1 text-[11px] ${
                confidence >= 0.72
                  ? "border-[var(--status-ok)]/35 text-[var(--status-ok)]"
                  : "border-[var(--nexodoc-tertiary-strong)]/50 text-[var(--nexodoc-tertiary)]"
              }`}
            >
              {Math.round(confidence * 100)}%
            </Badge>
          )}
          <p className="truncate text-[11px] font-medium">{asset.sourceFileName}</p>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {detail || asset.summary || "Resumo em leitura"}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          title="Visualizar página"
          aria-label={`Visualizar página ${asset.pageNumber} de ${asset.sourceFileName}`}
          className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground opacity-80 transition-colors hover:border-[var(--nexodoc-tertiary-strong)] hover:text-[var(--nexodoc-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={(event) => {
            event.stopPropagation();
            onPreview();
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-70" aria-hidden />
      </div>
    </div>
  );
}

function PreviewPanel({
  target,
  onZoom,
}: {
  target?: PreviewTarget;
  onZoom: () => void;
}) {
  const [failed, setFailed] = useState(false);

  if (!target) {
    return (
      <div className="rounded-md border border-dashed bg-muted/15 p-4 text-center">
        <Eye className="mx-auto h-4 w-4 text-muted-foreground" />
        <p className="mt-2 text-xs text-muted-foreground">
          Selecione uma pagina para visualizar.
        </p>
      </div>
    );
  }

  const { asset, file, fileUrl } = target;
  const role = getAssetRole(asset);
  const nativeFileUrl = fileUrl ?? null;

  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="h-4 px-1 text-[11px]">
              {ROLE_LABELS[role]}
            </Badge>
            <span className="font-mono text-[11px]">Pag. {asset.pageNumber}</span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {asset.sourceFileName}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[11px]"
          onClick={onZoom}
        >
          <ZoomIn className="mr-1 h-3 w-3" />
          Zoom
        </Button>
      </div>
      <div className="flex h-56 items-center justify-center bg-muted/25 p-2">
        {failed && nativeFileUrl ? (
          <NativePdfPageFrame
            src={nativeFileUrl}
            pageNumber={asset.pageNumber}
            className="h-full w-full rounded-sm"
          />
        ) : file || fileUrl ? (
          <Document
            key={`${asset.sourceFileId}-${fileUrl ?? asset.sourceFileName}`}
            file={fileUrl ?? file}
            loading={<PreviewSkeleton />}
            onLoadError={(error) => {
              console.error(`Erro ao carregar preview de ${asset.sourceFileName}:`, error);
              setFailed(true);
            }}
            error={
              nativeFileUrl ? (
                <NativePdfPageFrame
                  src={nativeFileUrl}
                  pageNumber={asset.pageNumber}
                  className="h-full w-full rounded-sm"
                />
              ) : (
                <PreviewError />
              )
            }
          >
            <Page
              pageNumber={asset.pageNumber}
              width={230}
              loading={<PreviewSkeleton />}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        ) : (
          <PreviewError />
        )}
      </div>
    </div>
  );
}

function PageZoomOverlay({
  target,
  onClose,
}: {
  target: PreviewTarget;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [baseWidth, setBaseWidth] = useState(760);
  const [failed, setFailed] = useState(false);
  const { asset, file, fileUrl } = target;
  const role = getAssetRole(asset);

  useEffect(() => {
    function updateWidth() {
      setBaseWidth(Math.min(860, Math.max(360, window.innerWidth - 96)));
    }

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const pageWidth = Math.round(baseWidth * zoom);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Pagina ampliada ${asset.pageNumber}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-md border border-border bg-[var(--nexodoc-panel)] shadow-[0_24px_90px_rgb(0_0_0_/_0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-5 px-1.5 text-[11px]">
                {ROLE_LABELS[role]}
              </Badge>
              <span className="text-xs font-semibold">Pag. {asset.pageNumber}</span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {asset.sourceFileName}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              title="Reduzir"
              onClick={() => setZoom((current) => Math.max(0.75, Number((current - 0.15).toFixed(2))))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs tabular-nums"
              title="Ajustar"
              onClick={() => setZoom(1)}
            >
              <Maximize2 className="mr-1 h-3.5 w-3.5" />
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              title="Ampliar"
              onClick={() => setZoom((current) => Math.min(1.8, Number((current + 0.15).toFixed(2))))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Fechar"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 overflow-auto bg-muted/25 p-4">
          <div className="mx-auto w-fit overflow-hidden rounded-sm border bg-white shadow-[0_18px_50px_rgb(0_0_0_/_0.35)]">
            {failed && fileUrl ? (
              <NativePdfPageFrame
                src={fileUrl}
                pageNumber={asset.pageNumber}
                className="h-[78vh]"
                style={{ width: pageWidth }}
              />
            ) : file || fileUrl ? (
              <Document
                key={`zoom-${asset.sourceFileId}-${fileUrl ?? asset.sourceFileName}`}
                file={fileUrl ?? file}
                loading={<PreviewSkeleton />}
                onLoadError={(error) => {
                  console.error(`Erro ao carregar zoom de ${asset.sourceFileName}:`, error);
                  setFailed(true);
                }}
                error={
                  fileUrl ? (
                    <NativePdfPageFrame
                      src={fileUrl}
                      pageNumber={asset.pageNumber}
                      className="h-[78vh]"
                      style={{ width: pageWidth }}
                    />
                  ) : (
                    <PreviewError />
                  )
                }
              >
                <Page
                  pageNumber={asset.pageNumber}
                  width={pageWidth}
                  loading={<PreviewSkeleton />}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            ) : (
              <PreviewError />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="flex h-48 w-40 items-center justify-center bg-muted">
      <div className="h-4 w-4 animate-pulse rounded-full bg-muted-foreground/20" />
    </div>
  );
}

function PreviewError() {
  return (
    <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
      Preview indisponivel.
    </div>
  );
}

function NativePdfPageFrame({
  src,
  pageNumber,
  className,
  style,
}: {
  src: string;
  pageNumber: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <iframe
      title={`Preview da pagina ${pageNumber}`}
      src={`${src}#page=${pageNumber}&zoom=page-fit&toolbar=0&navpanes=0&scrollbar=0`}
      className={`pointer-events-none block border-0 bg-white ${className ?? ""}`}
      style={style}
    />
  );
}
