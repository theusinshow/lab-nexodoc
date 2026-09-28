"use client";

/**
 * SAÍDA — prévia e exportação a partir do MESMO manifesto (V01/V06/V07).
 *
 * "Gerar PDF" ficava liberado com um volume vazio ("1 linha pronta para
 * exportação"). Agora exportar exige a estrutura sem pendência que impeça, e o
 * painel diz exatamente o que sai (arquivos, páginas), em que formato, e em que
 * pé está a conferência. A prévia vale para qualquer volume, inclusive dentro
 * de um pacote ZIP.
 */

import { useMemo, useState } from "react";
import { Download, Eye, FileArchive, FileText, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  rotuloDoVolume,
  situacaoDaConferencia,
  type EstadoDaMontagem,
  type prontidaoDaMontagem,
} from "@/modules/volume-builder/lib/volume/mesa";
import { generateReportFileName, generateZipFileName } from "@/modules/volume-builder/lib/volume/volume-naming";
import { getVolumeApiEndpoint } from "@/modules/volume-builder/lib/utils/volume-api-endpoint";
import type { ConferenciaDaMesa } from "../use-mesa";
import { arquivosUsados, rowsParaEnvio } from "./envio";

export function SaidaDaMesa({
  estado,
  bytes,
  prontidao,
  assinatura,
  conferencia,
  projetoId,
  onPrevia,
}: {
  estado: EstadoDaMontagem;
  bytes: ReadonlyMap<string, File>;
  prontidao: ReturnType<typeof prontidaoDaMontagem>;
  assinatura: string;
  conferencia: ConferenciaDaMesa | null;
  projetoId: string | null;
  onPrevia: (rowId: string) => void;
}) {
  const [exportando, setExportando] = useState(false);
  const [baixandoRelatorio, setBaixandoRelatorio] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [volumeDaPrevia, setVolumeDaPrevia] = useState<string>("");

  const rows = estado.rows;
  const zip = rows.length > 1;
  const envio = useMemo(() => rowsParaEnvio(estado, prontidao), [estado, prontidao]);
  const situacao = situacaoDaConferencia(conferencia, assinatura);
  const paginasTotais = prontidao.volumes.reduce((s, v) => s + v.paginas, 0);

  function montarFormulario() {
    const form = new FormData();
    const usados = arquivosUsados(envio);
    const importados = estado.importedFiles.filter((f) => usados.has(f.id));
    form.append("rows", JSON.stringify(envio));
    form.append("metadata", JSON.stringify(estado.metadata));
    form.append("importedFiles", JSON.stringify(importados));
    if (projetoId) form.append("projectId", projetoId);
    for (const f of importados) {
      const b = bytes.get(f.id);
      if (b) form.append(`file_${f.id}`, b);
    }
    return form;
  }

  async function exportar() {
    setExportando(true);
    setErro(null);
    setFeito(null);
    try {
      const r = await fetch(getVolumeApiEndpoint("/api/volume/build"), { method: "POST", body: montarFormulario() });
      const tipo = r.headers.get("Content-Type") ?? "";
      if (!r.ok || !(tipo.includes("application/pdf") || tipo.includes("application/zip") || tipo.includes("octet-stream"))) {
        throw new Error(await lerErro(r, "O servidor não gerou o arquivo"));
      }
      const blob = await r.blob();
      const nome = r.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? (zip ? "volumes.zip" : "volume.pdf");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setFeito(
        `${nome} gerado (${(blob.size / 1024).toFixed(0)} KB).${projetoId ? " Registrado no projeto." : ""}`,
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao exportar.");
    } finally {
      setExportando(false);
    }
  }

  async function baixarRelatorio() {
    setBaixandoRelatorio(true);
    setErro(null);
    try {
      const r = await fetch(getVolumeApiEndpoint("/api/volume/report"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: envio, metadata: estado.metadata, importedFiles: estado.importedFiles, projectId: projetoId ?? undefined }),
      });
      if (!r.ok) throw new Error(await lerErro(r, "Erro ao gerar o relatório"));
      const texto = await r.text();
      const url = URL.createObjectURL(new Blob([texto], { type: "text/markdown" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = generateReportFileName(estado.metadata);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar o relatório.");
    } finally {
      setBaixandoRelatorio(false);
    }
  }

  const previaAlvo = volumeDaPrevia && rows.some((r) => r.id === volumeDaPrevia) ? volumeDaPrevia : rows[0]?.id ?? "";

  return (
    <section aria-label="Prévia e exportação" className="space-y-3 border bg-card p-3" data-exportavel={prontidao.exportavel}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">Prévia e exportação</h2>
        <Badge variant="outline" className="gap-1">
          {zip ? <FileArchive className="size-3" aria-hidden /> : <FileText className="size-3" aria-hidden />}
          {rows.length === 0 ? "nada a exportar" : zip ? `ZIP com ${rows.length} PDFs + relatório` : "PDF único"}
        </Badge>
      </div>

      {rows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="volume-da-previa" className="text-xs text-muted-foreground">
            Prévia de
          </label>
          <Select id="volume-da-previa" value={previaAlvo} onChange={(e) => setVolumeDaPrevia(e.target.value)} className="h-8 min-w-[9rem] flex-1">
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {rotuloDoVolume(estado, r.id)}
              </option>
            ))}
          </Select>
          <Button type="button" size="sm" variant="outline" onClick={() => onPrevia(previaAlvo)}>
            <Eye aria-hidden />
            Abrir prévia
          </Button>
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Volumes</dt>
        <dd className="font-mono">{rows.length}</dd>
        <dt className="text-muted-foreground">Páginas no total</dt>
        <dd className="font-mono">{paginasTotais}</dd>
        <dt className="text-muted-foreground">Estrutura</dt>
        <dd>{prontidao.exportavel ? "sem pendência que impeça" : `${prontidao.bloqueios} pendência(s) impedem`}</dd>
        <dt className="text-muted-foreground">Conferência</dt>
        <dd data-situacao-da-conferencia={situacao}>
          {situacao === "valida" ? "conferida (esta versão)" : situacao === "desatualizada" ? "alterada após conferir" : "não conferida"}
        </dd>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!prontidao.exportavel || exportando} onClick={() => void exportar()}>
          {exportando ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
          {zip ? `Gerar ZIP (${rows.length} PDFs)` : "Gerar PDF"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={rows.length === 0 || baixandoRelatorio} onClick={() => void baixarRelatorio()}>
          {baixandoRelatorio ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
          Baixar relatório (.md)
        </Button>
      </div>
      {!prontidao.exportavel && rows.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Resolva as pendências que impedem exportar (lista em Conferência). A prévia funciona mesmo assim, para você ver o que falta.
        </p>
      ) : null}
      {zip && rows.length > 0 ? (
        <p className="font-mono text-[11px] text-muted-foreground">{generateZipFileName(estado.metadata, rows)}</p>
      ) : null}
      {situacao !== "valida" && prontidao.exportavel ? (
        <p className="text-xs text-[var(--status-warning)]">
          {situacao === "desatualizada" ? "A montagem mudou depois da conferência." : "Esta versão não foi conferida."} Exportar
          continua possível; conferir antes é o recomendado.
        </p>
      ) : null}
      {erro ? (
        <p className="text-xs text-[var(--status-critical)]" role="alert" data-erro-da-exportacao>
          {erro}
        </p>
      ) : null}
      {feito ? (
        <p className="text-xs text-[var(--status-ok)]" role="status" data-exportado>
          {feito}
        </p>
      ) : null}
    </section>
  );
}

async function lerErro(r: Response, padrao: string) {
  const tipo = r.headers.get("Content-Type") ?? "";
  if (tipo.includes("application/json")) {
    const d = (await r.json().catch(() => null)) as { error?: string } | null;
    return d?.error || `${padrao} (HTTP ${r.status}).`;
  }
  const t = await r.text().catch(() => "");
  if (t.trim().startsWith("<")) return `${padrao}: o servidor respondeu uma página HTML (HTTP ${r.status}). Confira se a sessão está ativa.`;
  return t.trim() || `${padrao} (HTTP ${r.status}).`;
}
