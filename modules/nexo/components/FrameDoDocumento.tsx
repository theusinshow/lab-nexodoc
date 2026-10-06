"use client";

/**
 * O DOCUMENTO COM A FORMA DO DOCUMENTO, desenhado a partir do MODELO.
 *
 * O frame anterior era um esqueleto em CSS fixo: descrevia a capa de Criciúma
 * como ela era num dia. Quem edita o modelo é o engenheiro — no dia seguinte o
 * modelo tinha duas linhas de nome de obra, e o esqueleto passou a mentir sem
 * que nada acusasse.
 *
 * Aqui a ordem, o alinhamento e o corpo saem do `content.xml`. Marcador vira
 * campo no lugar em que será impresso; texto fixo em volta continua texto;
 * marcador repetido vira UM campo com tantas linhas quantas as ocorrências,
 * porque é assim que `distribuirNosMarcadores` reparte o valor na geração.
 * Acrescentar um campo ao modelo passa a bastar — nada de código.
 *
 * Não é pré-visualização fiel (fonte e brasão são do ODT); é a ESTRUTURA, que é
 * o que se confere antes de gerar.
 */

import type { ParagrafoDoModelo } from "@/server/odt/layout";
import type { ModoDoFrame } from "../lib/corpo-do-frame";
import { MarcaDaPrefeitura } from "./MarcaDaPrefeitura";

export interface CampoDoFrame {
  /** Nome do marcador, ex. "NOME_OBRA". */
  marcador: string;
  rotulo: string;
  /** Ausente = editável. Presente = derivado; desenhado em cinza com a origem. */
  derivadoDe?: string;
  /** Força o número de linhas; senão vale o nº de ocorrências no modelo. */
  linhas?: number;
  placeholder?: string;
}

/** Largura da folha A4 em pt: é contra ela que o corpo de cada linha se mede. */
const LARGURA_A4_PT = 595;

function familiaDaFonte(fonte: string | undefined): string {
  return fonte ? `"${fonte}", Arial, Helvetica, sans-serif` : "Arial, Helvetica, sans-serif";
}

const ALINHAMENTO: Record<ParagrafoDoModelo["alinhamento"], string> = {
  start: "justify-start text-left",
  center: "justify-center text-center",
  end: "justify-end text-right",
};

export function FrameDoDocumento({
  layout,
  campos,
  valores,
  derivados = {},
  onChange,
  prefeitura,
  destaques = {},
  opcoes = {},
}: {
  layout: ParagrafoDoModelo[];
  campos: CampoDoFrame[];
  /** Só o que foi DECIDIDO à mão. Vazio significa "vale o carimbo". */
  valores: Record<string, string>;
  /**
   * O que o carimbo/arquivo/divisão já dizem, por marcador. Entra como texto
   * FANTASMA nos campos editáveis, nunca como valor.
   *
   * Como valor, o campo não podia ser apagado: limpar devolvia "" ao estado, o
   * derivado reaparecia no mesmo render, e o controle brigava com quem digitava.
   * Fantasma preserva a regra "vazio = vale o carimbo" e ainda mostra o texto
   * já quebrado nas linhas em que vai sair impresso.
   */
  derivados?: Record<string, string>;
  onChange: (marcador: string, valor: string) => void;
  /**
   * `campo` (padrão) = formulário com a FORMA do documento, dentro do chat.
   * `documento` = a coluna alargou e o texto volta a seguir o corpo do modelo.
   *
   * A diferença entre os dois é SÓ a tipografia: ordem, alinhamento e número de
   * linhas continuam saindo do `content.xml` nos dois. Ver [[corpo-do-frame.ts]].
   */
  modo?: ModoDoFrame;
  /**
   * A prefeitura do MODELO aberto — o nome do template, não o que o carimbo
   * leu. Ausente (ou vazia) = sem cabeçalho, e o frame fica só com o papel.
   *
   * A marca vai no CABEÇALHO e NUNCA DENTRO DO PAPEL. O frame existe para
   * conferir ESTRUTURA — ordem, alinhamento, quantas linhas —, e não é
   * pré-visualização fiel: fonte e brasão são do ODT. Um papel colorido
   * prometeria uma fidelidade que o gerador não entrega, e a promessa quebrada
   * apareceria só depois de imprimir. No cabeçalho ela faz o trabalho certo,
   * que é confirmar QUAL MODELO está aberto — o campo cujo erro custa o projeto
   * inteiro, e que originou este produto.
   */
  prefeitura?: string | null;
  /**
   * O QUE OLHAR (06/10/2026): `falta` = o Gerar não passa sem ele (âmbar);
   * `sugerido` = o Nexo preencheu e ninguém conferiu (tracejado violeta).
   * Ver `destaques-do-frame.ts`.
   */
  destaques?: Readonly<Record<string, "falta" | "sugerido">>;
  /** Respostas prontas DENTRO do campo (o número do volume: 1, 2, 3, 4). */
  opcoes?: Readonly<Record<string, readonly string[]>>;
}) {
  const campoDe = (marcador: string) => campos.find((c) => c.marcador === marcador);

  /*
   * Quantas vezes cada marcador aparece no modelo. O nome da obra ocupa DOIS
   * parágrafos, um por linha impressa — o campo tem de aparecer UMA vez, com
   * duas linhas. Desenhá-lo duas vezes faria o engenheiro digitar a obra duas
   * vezes para ver uma.
   */
  const ocorrencias = new Map<string, number>();
  for (const p of layout) {
    for (const parte of p.partes) {
      if (parte.tipo === "marcador") {
        ocorrencias.set(parte.nome, (ocorrencias.get(parte.nome) ?? 0) + 1);
      }
    }
  }

  const jaDesenhados = new Set<string>();

  const cabecalho = (prefeitura ?? "").trim();

  /*
   * A FOLHA (06/10/2026): o frame deixou de ser formulário com caixas empilhadas
   * e passou a PARECER A CAPA — folha A4 branca, texto escuro, o corpo de cada
   * linha em pt proporcional à largura da folha (`cqw`), negrito e fonte do
   * modelo, e as linhas em branco do modelo como o espaço real entre os blocos.
   * Os campos aparecem como o TEXTO que vai sair e se editam no lugar, sem
   * caixa. Continua não sendo o PDF (brasão e métrica exata são do ODT).
   */
  const papel = (
    <div className="flex flex-col gap-2">
      <div className="@container w-full">
        <div
          className="relative mx-auto flex aspect-[1/1.414] w-full flex-col overflow-hidden rounded-[2px] bg-white text-[#17191c] shadow-[0_10px_28px_rgb(0_0_0/0.38)]"
          style={{ padding: "9cqw 8cqw" }}
          data-prova="papel-da-capa"
        >
          {layout.map((paragrafo) => {
            const tamanho = `${((paragrafo.corpo ?? 12) / LARGURA_A4_PT) * 100}cqw`;
            if (paragrafo.partes.length === 0) {
              // A linha em branco do modelo É o espaço entre os blocos da capa.
              return <div key={paragrafo.indice} aria-hidden style={{ height: `calc(${tamanho} * 1.25)` }} />;
            }
            return (
              <div
                key={paragrafo.indice}
                className={`flex flex-wrap items-baseline ${ALINHAMENTO[paragrafo.alinhamento]}`}
                style={{
                  fontSize: tamanho,
                  lineHeight: 1.25,
                  fontWeight: paragrafo.negrito ? 700 : 400,
                  fontFamily: familiaDaFonte(paragrafo.fonte),
                }}
              >
                {paragrafo.partes.map((parte, i) => {
                  const chave = `${paragrafo.indice}-${i}`;
                  if (parte.tipo === "texto") {
                    return (
                      <span key={chave} className="whitespace-pre-wrap">
                        {parte.valor}
                      </span>
                    );
                  }
                  if (parte.tipo === "quebrado") {
                    /*
                     * O marcador que o LibreOffice partiu em spans. O gerador nunca
                     * o substituirá e ele sai LITERAL na capa — foi assim que
                     * `{{(TOMO)}}` chegou à produção sem nada acusar. Aqui é visível.
                     */
                    return (
                      <span key={chave} role="alert" className="bg-red-100 px-1 font-mono text-[11px] text-red-700">
                        {parte.bruto} — marcador quebrado, conserte no modelo
                      </span>
                    );
                  }

                  const campo = campoDe(parte.nome);
                  // Marcador que o modelo tem e ninguém mapeou vira texto livre: é o
                  // que torna verdadeira a promessa de que editar o ODT basta.
                  const rotulo = campo?.rotulo ?? parte.nome;

                  if (campo?.derivadoDe) {
                    const texto = valores[parte.nome] || derivados[parte.nome];
                    return (
                      <span key={chave} className="whitespace-pre-wrap" title={`${rotulo} · ${campo.derivadoDe}`}>
                        {texto || <span className="text-[#9aa0a6]">{rotulo.toUpperCase()}</span>}
                      </span>
                    );
                  }

                  if (jaDesenhados.has(parte.nome)) return null;
                  jaDesenhados.add(parte.nome);

                  const linhas = campo?.linhas ?? ocorrencias.get(parte.nome) ?? 1;
                  const destaque = destaques[parte.nome];
                  /*
                   * SEM CAIXA: o campo é o texto da capa. O destaque é discreto —
                   * pontilhado violeta no sugerido, faixa âmbar no que falta — e
                   * o texto fantasma (o que vale se ninguém digitar) sai quase
                   * preto, porque É o que vai ser impresso.
                   */
                  const realce =
                    destaque === "falta"
                      ? " bg-[#f6c453]/45 outline outline-1 outline-[#d99a1e]"
                      : destaque === "sugerido"
                        ? " underline decoration-dotted decoration-[#7c6cf0] decoration-2 underline-offset-[0.2em]"
                        : "";
                  const comum =
                    `rounded-[2px] bg-transparent px-[0.15em] text-inherit outline-none transition-colors hover:bg-black/[0.05] focus:bg-[#7c6cf0]/10 focus:outline focus:outline-1 focus:outline-[#7c6cf0] ${
                      // Quase preto SÓ quando o fantasma é o que vai sair impresso;
                      // a dica de um campo opcional vazio ("bairro (opcional)") fica clara.
                      derivados[parte.nome] ? "placeholder:text-[#2e3236]" : "placeholder:text-[#b3b8bd] placeholder:italic"
                    }`;
                  const fantasma = destaque === "falta" ? `${rotulo.toUpperCase()} ?` : derivados[parte.nome] || campo?.placeholder;
                  return linhas > 1 ? (
                    <textarea
                      key={chave}
                      aria-label={rotulo}
                      rows={linhas}
                      value={valores[parte.nome] ?? ""}
                      placeholder={fantasma}
                      onChange={(e) => onChange(parte.nome, e.target.value)}
                      className={`${comum} w-full resize-none ${ALINHAMENTO[paragrafo.alinhamento]}${realce}`}
                      style={{ font: "inherit", lineHeight: 1.25 }}
                    />
                  ) : (
                    <input
                      key={chave}
                      aria-label={rotulo}
                      value={valores[parte.nome] ?? ""}
                      placeholder={fantasma}
                      onChange={(e) => onChange(parte.nome, e.target.value)}
                      className={`${comum} min-w-[3ch] max-w-full [field-sizing:content] ${ALINHAMENTO[paragrafo.alinhamento]}${realce}`}
                      style={{ font: "inherit" }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {/* As respostas prontas ficam FORA da folha: dentro, quebrariam o desenho da capa. */}
      {Object.entries(opcoes).map(([marcador, prontas]) =>
        prontas.length === 0 ? null : (
          <div
            key={marcador}
            className="flex flex-wrap items-center gap-1.5 text-xs"
            role="group"
            aria-label={`${campoDe(marcador)?.rotulo ?? marcador}: escolha`}
          >
            <span className="text-[var(--status-warning)]">{campoDe(marcador)?.rotulo ?? marcador}:</span>
            {prontas.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange(marcador, v)}
                className="min-h-8 min-w-8 rounded-[4px] border border-[var(--status-warning)]/60 px-2 font-mono text-[12px] text-foreground hover:bg-[var(--status-warning)]/15 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
              >
                {v}
              </button>
            ))}
            <span className="text-muted-foreground">ou digite na capa</span>
          </div>
        ),
      )}
    </div>
  );

  if (!cabecalho) return papel;

  return (
    <div className="flex flex-col gap-2">
      {/*
        A CHAPA, e uma por tela: é a forma que pode ser lida como imagem, e ela
        só cabe onde a cidade é O ASSUNTO — aqui, a conferência antes de gerar.
      */}
      <div className="flex items-center gap-3.5">
        <MarcaDaPrefeitura prefeitura={cabecalho} forma="chapa" />
        <span className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.07em] text-muted-foreground">
          {cabecalho}
        </span>
      </div>
      {papel}
    </div>
  );
}
