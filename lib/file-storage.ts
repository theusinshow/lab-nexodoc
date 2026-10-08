import { excedeOLimite, motivoDeArquivoGrande } from "@/lib/limite-do-anexo";
import { guardarNoCofre } from "@/lib/cofre";
import { getChecksumSha256 } from "@/lib/project-store";

type StorableData = Buffer | Uint8Array | string;

export type StorageDescriptor = {
  storageProvider: string;
  storageKey: string | null;
  downloadUrl: string | null;
  sizeBytes: number;
  checksumSha256: string;
};

/**
 * DESCREVE, sem guardar: checksum e tamanho. Quem guarda é o cofre
 * ([[cofre.ts]]); o chamador sobrescreve `storageProvider`/`storageKey` quando
 * os bytes foram de fato para lá. "none" aqui é a verdade até prova em contrário
 * — antes, `NEXODOC_STORAGE_PROVIDER=s3` faria esta função anunciar uma chave de
 * um arquivo que ninguém gravou.
 */
export function describeStoredFile(input: {
  data: StorableData;
  module: string;
  projectId?: string | null;
  fileName: string;
}): StorageDescriptor {
  const buffer = toBuffer(input.data);
  return {
    storageProvider: "none",
    storageKey: null,
    downloadUrl: null,
    sizeBytes: buffer.byteLength,
    checksumSha256: getChecksumSha256(buffer),
  };
}

function toBuffer(data: StorableData) {
  if (typeof data === "string") {
    return Buffer.from(data, "utf8");
  }

  return Buffer.from(data);
}

/**
 * O TETO POR ARQUIVO vive em [[limite-do-anexo.ts]] desde 17/09/2026 — aqui ele
 * estava em 25.000.000 de bytes e nas rotas em 25 mebibytes (26.214.400), e um
 * arquivo entre os dois passava na rota para ser recusado na gravação.
 */
export { LIMITE_DO_ARQUIVO_BYTES as LIMITE_DO_ARQUIVO } from "@/lib/limite-do-anexo";

export class ArquivoRecusado extends Error {
  /*
   * Campo declarado e atribuído à mão, e não propriedade de parâmetro: o node
   * roda os scripts em modo strip-only, que apaga tipos sem transformar sintaxe.
   * Mesmo motivo de `AchadoRecusado` em [[achado-compartilhado.ts]].
   */
  readonly motivo: string;

  constructor(motivo: string) {
    super(motivo);
    this.name = "ArquivoRecusado";
    this.motivo = motivo;
  }
}

/**
 * GUARDA OS BYTES — o primeiro caminho de escrita que este módulo já teve.
 *
 * `describeStoredFile`, acima, só descreve: calcula chave e checksum e devolve
 * `provider: "none"`. Era um esqueleto para um provedor que nunca foi
 * construído, e por isso o memorial chegava ao servidor e era descartado — e
 * quem recebia um achado por e-mail não tinha como conferi-lo no documento.
 *
 * IDEMPOTENTE POR CONSTRUÇÃO: a chave primária é o checksum, então gravar o
 * mesmo conteúdo duas vezes é `update` de nada. Não há "já existe?" a perguntar
 * antes — e é isso que faz duas pessoas auditando o mesmo memorial ao mesmo
 * tempo não virar um erro de banco.
 */
export async function guardarArquivo(args: {
  data: StorableData;
  organizationId: string;
  mimeType: string;
}): Promise<{ checksumSha256: string; sizeBytes: number; onde: string }> {
  const buffer = toBuffer(args.data);

  if (excedeOLimite(buffer.byteLength)) {
    throw new ArquivoRecusado(motivoDeArquivoGrande("", buffer.byteLength));
  }

  // Onde e como os bytes são guardados (Postgres ou bucket, cifrados) é do cofre.
  const { checksumSha256, onde } = await guardarNoCofre({
    bytes: buffer,
    organizationId: args.organizationId,
    mimeType: args.mimeType,
  });

  return { checksumSha256, sizeBytes: buffer.byteLength, onde };
}
