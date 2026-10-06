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
import { classeDeCorpo, type ModoDoFrame } from "../lib/corpo-do-frame";
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
  modo = "campo",
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

  const papel = (
    <div className="nx-edge-8 p-4 [--nx-fill:var(--nexodoc-recessed)]">
      {layout.map((paragrafo) => {
        if (paragrafo.partes.length === 0) return null;

        return (
          <div
            key={paragrafo.indice}
            className={`flex flex-wrap items-baseline gap-2 py-1 ${
              ALINHAMENTO[paragrafo.alinhamento]
            }`}
          >
            {paragrafo.partes.map((parte, i) => {
              const chave = `${paragrafo.indice}-${i}`;

              if (parte.tipo === "texto") {
                return (
                  <span
                    key={chave}
                    className={`${classeDeCorpo(paragrafo.corpo, modo)} whitespace-pre text-foreground`}
                  >
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
                  <span
                    key={chave}
                    role="alert"
                    /* Sem camada de contorno, pela mesma razao do badge: borda
                       E fundo sao translucidos, e numa camada o miolo comporia
                       sobre a cor da borda em vez de sobre a pagina. */
                    className="nx-cut-5 border-0 bg-destructive/10 px-2 py-1 font-mono text-xs text-destructive"
                  >
                    {parte.bruto} — marcador quebrado, conserte no modelo
                  </span>
                );
              }

              const campo = campoDe(parte.nome);
              // Marcador que o modelo tem e ninguém mapeou vira texto livre: é o
              // que torna verdadeira a promessa de que editar o ODT basta.
              const rotulo = campo?.rotulo ?? parte.nome;

              if (campo?.derivadoDe) {
                return (
                  <span
                    key={chave}
                    className="font-mono text-xs text-muted-foreground"
                    title={`${rotulo} · ${campo.derivadoDe}`}
                  >
                    {valores[parte.nome] || derivados[parte.nome] || "—"}
                    <span className="opacity-60"> · {campo.derivadoDe}</span>
                  </span>
                );
              }

              if (jaDesenhados.has(parte.nome)) return null;
              jaDesenhados.add(parte.nome);

              const linhas = campo?.linhas ?? ocorrencias.get(parte.nome) ?? 1;
              const comum =
                /*
                 * EXCECAO da spec do chanfro: campo tracejado do carimbo fica com raio de
                 * 4px e borda tracejada. Tracejado nao sobrevive ao recorte, e aqui o
                 * tracejado e PAPEL, nao interface. O painel que os contem tem chanfro.
                 *
                 * ALTURA MINIMA DE 32px nos DOIS modos -- o "compacto" que a DESIGN.md
                 * documenta. Antes era `py-1` com texto de 11px, o que dava ~25px: abaixo
                 * do piso, e pequeno demais para acertar com o cursor. No modo documento o
                 * TEXTO encolhe conforme o modelo, mas a CAIXA nao -- fidelidade que
                 * impede editar nao serve ao modo que existe para conferir.
                 */
                "min-h-8 min-w-0 flex-1 rounded-[4px] border border-dashed border-border bg-transparent px-2 py-1 outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-solid focus:border-[var(--ring)] focus:bg-[var(--nexodoc-panel)]";
              const forma = `${classeDeCorpo(paragrafo.corpo, modo)} ${
                ALINHAMENTO[paragrafo.alinhamento]
              }`;
              const destaque = destaques[parte.nome];
              const realce =
                destaque === "falta"
                  ? " !border-solid !border-[var(--status-warning)] bg-[var(--status-warning)]/10"
                  : destaque === "sugerido"
                    ? " !border-[var(--ds-nexo)]/70 bg-[var(--ds-nexo)]/5"
                    : "";
              const prontas = opcoes[parte.nome] ?? [];

              const controle = linhas > 1 ? (
                <textarea
                  key={chave}
                  aria-label={rotulo}
                  rows={linhas}
                  value={valores[parte.nome] ?? ""}
                  placeholder={derivados[parte.nome] || campo?.placeholder}
                  onChange={(e) => onChange(parte.nome, e.target.value)}
                  className={`${comum} resize-none leading-snug ${forma}${realce}`}
                />
              ) : (
                <input
                  key={chave}
                  aria-label={rotulo}
                  value={valores[parte.nome] ?? ""}
                  placeholder={derivados[parte.nome] || campo?.placeholder}
                  onChange={(e) => onChange(parte.nome, e.target.value)}
                  className={`${comum} ${forma}${realce}`}
                />
              );
              if (prontas.length === 0) return controle;
              return (
                <span key={chave} className="flex min-w-0 flex-1 flex-col items-stretch gap-1">
                  {controle}
                  <span className="flex flex-wrap justify-center gap-1" role="group" aria-label={`${rotulo}: escolha rápida`}>
                    {prontas.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onChange(parte.nome, v)}
                        className="rounded-[4px] border border-[var(--status-warning)]/60 px-2 py-0.5 font-mono text-[11px] text-foreground hover:bg-[var(--status-warning)]/15 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
                      >
                        {v}
                      </button>
                    ))}
                  </span>
                </span>
              );
            })}
          </div>
        );
      })}
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
