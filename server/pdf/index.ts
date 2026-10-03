import { execFile } from "child_process";
import { join } from "path";
import { mkdir, writeFile, readFile, rm } from "fs/promises";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { pathToFileURL } from "url";

export interface ConvertToPdfResult {
  pdfBuffer: Buffer | null;
  error?: string;
}

const CONVERTER_URL = process.env.DOCUMENT_CONVERTER_URL?.trim();

export async function convertOdtToPdf(odtBuffer: Buffer): Promise<ConvertToPdfResult> {
  if (CONVERTER_URL) {
    return convertViaRender(odtBuffer);
  }

  if (process.env.LIBREOFFICE_PATH) {
    return convertViaLocal(odtBuffer);
  }

  return {
    pdfBuffer: null,
    error:
      "PDF indisponivel. Configure DOCUMENT_CONVERTER_URL (Render) ou LIBREOFFICE_PATH (local) para habilitar a conversao.",
  };
}

async function convertViaRender(odtBuffer: Buffer): Promise<ConvertToPdfResult> {
  try {
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(odtBuffer)], { type: "application/vnd.oasis.opendocument.text" }), "document.odt");

    const response = await fetch(CONVERTER_URL!, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errPayload = await response.json().catch(() => null);
      throw new Error(errPayload?.error || `Render retornou status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    if (arrayBuffer.byteLength === 0) {
      return { pdfBuffer: null, error: "Render retornou PDF vazio." };
    }

    return { pdfBuffer: Buffer.from(arrayBuffer) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { pdfBuffer: null, error: `Falha na conversao via Render (${CONVERTER_URL}): ${message}` };
  }
}

/*
 * NO MÁXIMO 3 LIBREOFFICE ABERTOS — 03/10/2026.
 *
 * Com um perfil por conversão (ver `execLibreOffice`) elas já não se atrapalham,
 * mas cada `soffice` ocupa ~150-250 MB e divide o container com o Node. Dez
 * juntas chegariam perto de 2 GB num serviço de 4 GB — e OOM aqui derruba o
 * container inteiro, com as auditorias abertas junto. A quarta conversão espera
 * a vez: medido, cada uma leva ~3-5 s, então a fila custa segundos.
 * `NEXODOC_PDF_SIMULTANEOS` muda o teto sem deploy de código.
 */
const MAXIMO_SIMULTANEOS = Math.max(1, Number(process.env.NEXODOC_PDF_SIMULTANEOS) || 3);
let abertos = 0;
const esperando: (() => void)[] = [];

async function naVez<T>(tarefa: () => Promise<T>): Promise<T> {
  if (abertos >= MAXIMO_SIMULTANEOS) {
    await new Promise<void>((liberar) => esperando.push(liberar));
  }
  abertos++;
  try {
    return await tarefa();
  } finally {
    abertos--;
    esperando.shift()?.();
  }
}

async function convertViaLocal(odtBuffer: Buffer): Promise<ConvertToPdfResult> {
  return naVez(() => converterAgora(odtBuffer));
}

async function converterAgora(odtBuffer: Buffer): Promise<ConvertToPdfResult> {
  const tmpDir = join(tmpdir(), `nexodoc-pdf-${randomUUID()}`);
  const odtPath = join(tmpDir, "document.odt");
  const pdfPath = join(tmpDir, "document.pdf");

  try {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(odtPath, odtBuffer);

    await execLibreOffice(process.env.LIBREOFFICE_PATH!, tmpDir);

    const pdfBuffer = await readFile(pdfPath);

    if (pdfBuffer.length === 0) {
      return { pdfBuffer: null, error: "LibreOffice gerou PDF vazio." };
    }

    return { pdfBuffer };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { pdfBuffer: null, error: `Falha na conversao local: ${message}` };
  } finally {
    try { await rm(tmpDir, { recursive: true, force: true }); } catch { /* cleanup non-critical */ }
  }
}

/*
 * UM PERFIL DO LIBREOFFICE POR CONVERSÃO — 03/10/2026.
 *
 * Sem `-env:UserInstallation`, todo `soffice` usa o MESMO perfil (um por HOME),
 * e duas conversões simultâneas disputam a trava dele: a segunda se entrega à
 * primeira ou sai com erro, sem PDF. Medido com
 * `scripts/test-pdf-concorrente.ts`: 3 de 6 conversões simultâneas falhavam.
 * Com o perfil dentro da pasta temporária de cada conversão, elas não se veem
 * — e o `rm` do `finally` leva o perfil junto.
 *
 * Criar o perfil custa alguns segundos na primeira abertura; o teto sobe de
 * 30s para 60s para que várias conversões juntas num servidor ocupado não
 * estourem por causa disso.
 */
function execLibreOffice(binaryPath: string, workDir: string): Promise<void> {
  const perfil = pathToFileURL(join(workDir, "perfil-libreoffice")).href;
  return new Promise((resolve, reject) => {
    execFile(
      binaryPath,
      [
        `-env:UserInstallation=${perfil}`,
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        workDir,
        join(workDir, "document.odt"),
      ],
      { timeout: 60000 },
      (error) => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
}
