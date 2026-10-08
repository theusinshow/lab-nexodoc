# Caminho da rede na LD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** toda LD gerada pelo Nexo imprime no rodapé o caminho de rede do seu `.odt`, como as LDs do escritório.

**Architecture:** um módulo PURO (`lib/ld/caminho-da-rede.ts`) deduz, sugere e separa caminhos; a decisão do engenheiro vive como decisão da conversa (`caminhoDaRede`, JSON); `postLd` leva essa decisão ao servidor, que resolve o caminho final e o injeta no rodapé do ODT (propriedade estática no PDF, campo `text:file-name` no editável).

**Tech Stack:** Next.js (route handlers), JSZip, React + motion, testes em node cru (`node scripts/test-*.ts`).

Spec: `docs/superpowers/specs/2026-10-08-caminho-da-rede-na-ld-design.md`.

## Global Constraints

- Nunca inventar caminho: sem cliente e sem colagem, o rodapé não ganha linha.
- A pergunta é opcional e nunca trava o Gerar.
- Precedência: colado > memória da obra > dedução.
- Nome do arquivo no caminho: `<codigo com _>_<sigla>_ld_<rev>.odt` (ex.: `116_25_elt_ld_a.odt`).
- ZIP continua plano; volume misto leva uma LD por disciplina.
- Commits direto na main (preferência do Matheus).

## Arquivos

| arquivo | papel |
|---|---|
| `lib/ld/caminho-da-rede.ts` (novo) | tabela, sugestão, dedução, colagem, montagem do caminho, (de)serialização |
| `scripts/test-caminho-da-rede.ts` (novo) | testes puros |
| `lib/ld/ld-generation.ts` | `GeneratePayload.caminho` → meta + rodapé |
| `scripts/test-rodape-com-caminho.ts` (novo) | gera ODT e confere XML |
| `server/nexo/tools/create-ld.ts` | repassa `caminho` |
| `app/api/nexo/ld/route.ts` | lê `rede`/`editavel`, resolve o caminho |
| `modules/nexo/lib/generate.ts` | `LdOptions.rede`, `LdOptions.editavel` |
| `modules/nexo/lib/rede-da-conversa.ts` (novo) | `redeDasDecisoes(decisoes, valores)` |
| call sites de `postLd` | passam `rede` |
| `modules/nexo/components/PerguntaDaRede.tsx` (novo) | a pergunta |
| `modules/nexo/components/PlanoDeGeracao.tsx` | renderiza a pergunta |
| `modules/nexo/lib/editaveis-consolidados.ts` | LD por disciplina no misto |
| `app/api/nexo/obra/route.ts` | devolve a rede do volume irmão mais recente |

---

### Task 1: módulo puro do caminho

**Files:** Create `lib/ld/caminho-da-rede.ts`, `scripts/test-caminho-da-rede.ts`; Modify `package.json` (script `test:caminho-da-rede`).

**Produces:**
```ts
export const PASTA_DA_DISCIPLINA: Record<string, string>;
export interface AjusteDaDisciplina { base?: string; emissao?: string }
export interface RedeDaLd { cliente?: string; emissao?: string; revisao?: string; mes?: string; ano?: string; porDisciplina?: Record<string, AjusteDaDisciplina> }
export interface CaminhoColado { base: string; emissao: string; cliente?: string; pasta?: string }
export function sugerirEmissao(revisao: string, mes?: string, ano?: string): string;
export function nomeDaLd(codigo: string, disciplina: string, revisao: string): string;
export function baseDeduzida(a: { cliente?: string; codigo?: string; disciplina?: string }): string;
export function separarCaminhoColado(texto: string): CaminhoColado | null;
export function aplicarColado(rede: RedeDaLd, colado: CaminhoColado, disciplinas: readonly string[], alvo?: string): RedeDaLd;
export function caminhoDaLd(a: { cliente?: string; codigo?: string; disciplina?: string; revisao?: string; rede?: RedeDaLd }): string;
export function lerRede(valor: unknown): RedeDaLd;
export function gravarRede(rede: RedeDaLd): string;
```

- [ ] Escrever o teste (casos: sugestão `a`/`b`, mês por nome e por número; dedução Criciúma elt; sigla fora da tabela; sem cliente → ""; colado com aspas, `/`, barra final, `.odt` no fim, sem `documentos`, emissão de dois níveis; `aplicarColado` no topo reconhecido/não reconhecido e por alvo; precedência colado > emissão do topo > sugestão; `lerRede` de string inválida = {}; `gravarRede({})` = "").
- [ ] Rodar: `node scripts/test-caminho-da-rede.ts` → FAIL (módulo ausente).
- [ ] Implementar.
- [ ] Rodar → PASS.
- [ ] Commit `Caminho da rede: módulo puro (dedução, sugestão, colagem)`.

### Task 2: rodapé do ODT

**Files:** Modify `lib/ld/ld-generation.ts`; Create `scripts/test-rodape-com-caminho.ts`.

`GeneratePayload` ganha `caminho?: { texto: string; campo: "fixo" | "arquivo" }`. Em `generateOdtBuffer`, quando `texto` não-vazio:
- `meta.xml`: `replaceUserDefined(xml, "Caminho", texto)`.
- `styles.xml`: no `<style:footer>`, antes do primeiro `<text:tab/>` que precede `Pág.`, inserir
  - fixo: `<text:user-defined text:name="Caminho">${escapeXml(texto)}</text:user-defined>`
  - arquivo: `<text:file-name text:display="full">${escapeXml(texto)}</text:file-name>`
- Sem âncora `<text:tab/>Pág.` no rodapé (template alternativo): não insere nada.

- [ ] Teste: gerar com `caminho` fixo → `meta.xml` tem `meta:name="Caminho"`, `styles.xml` tem o user-defined antes de `Pág.`; com `arquivo` → `text:file-name`; sem `caminho` → `styles.xml` idêntico ao do template.
- [ ] FAIL → implementar → PASS.
- [ ] Commit `LD: caminho da rede no rodapé (fixo no PDF, campo no editável)`.

### Task 3: servidor resolve o caminho

**Files:** Modify `server/nexo/tools/create-ld.ts` (`CreateLDInput.caminho` → payload), `app/api/nexo/ld/route.ts`, `modules/nexo/lib/generate.ts`.

Rota: lê `body.rede` (via `lerRede`) e `body.editavel === true`; guarda `modelo?.id` como `cliente`; após `buildLdProposal`:
```ts
const texto = caminhoDaLd({ cliente: clienteDoModelo, codigo: proposal.resumo.codigo, disciplina: proposal.resumo.disciplinaCode, revisao: proposal.resumo.revisao, rede });
const result = await createLD({ ...proposal.input, ...(texto ? { caminho: { texto, campo: editavel ? "arquivo" : "fixo" } } : {}) });
```
e devolve `caminho: texto` na resposta. `postLd` envia `rede` (objeto) e `editavel`; `LdGenResult.caminho?: string`.

- [ ] `npx tsc --noEmit -p .` limpo nos arquivos tocados.
- [ ] Commit `LD: a rota resolve o caminho da rede`.

### Task 4: a decisão chega em todo `postLd`

**Files:** Create `modules/nexo/lib/rede-da-conversa.ts`; Modify `ConfirmationCard.tsx` (2 sites), `editar-artefato.ts` (`aplicarEdicaoNoNo`, `gerarItem` ganham `rede?`), `NexoCanvas.tsx`, `PlanoDeGeracao.tsx`, `use-entrega-do-volume.ts`, `editaveis-consolidados.ts`.

```ts
export function redeDasDecisoes(decisoes: DecisoesDoProjeto, valores: { mes?: string; ano?: string }): RedeDaLd {
  const rede = lerRede(decisoes.caminhoDaRede?.valor);
  return { ...rede, mes: rede.mes ?? valores.mes, ano: rede.ano ?? valores.ano };
}
```
Cada site passa `rede` ao lado de `identidade`. O campo `caminhoDaRede` NÃO entra no payload salvo do card (para não envelhecer a capa): filtrar ao montar o payload em `gerarItem`.

- [ ] tsc limpo; commit `Nexo: a decisão do caminho chega em toda LD gerada`.

### Task 5: a pergunta na tela

**Files:** Create `modules/nexo/components/PerguntaDaRede.tsx`; Modify `PlanoDeGeracao.tsx`.

Props: `{ cliente?: string; codigo: string; revisao: string; disciplinas: string[]; rede: RedeDaLd; onMudar(rede: RedeDaLd): void }`. Fechada: `✓ Na rede: …\documentos\<emissão>\ · N disciplinas · mudar`. Aberta: campo do topo (some com 1 disciplina) + uma linha por disciplina (`…\<codigo>\<pasta>\documentos\` apagado + emissão clicável; "própria · voltar"); `onPaste` usa `separarCaminhoColado` + `aplicarColado`; `title` com o caminho completo. Grava com `decidir("caminhoDaRede", gravarRede({ ...rede, revisao }), "")`. Mostrada quando o plano tem LD; independente de `capa`.

- [ ] Provar no navegador (dev): abrir conversa com pranchas, ver a linha fechada com a sugestão; colar `"P:\cad\pmcriciuma\116_25\cabeamento\documentos\1_x\116_25_cab_ld_a.odt"` e ver só CAB virar "própria".
- [ ] Commit `Nexo: pergunta "onde as LDs ficam na rede"`.

### Task 6: LD por disciplina no ZIP

**Files:** Modify `modules/nexo/lib/editaveis-consolidados.ts`.

Com `misturaDisciplinas(blocos)`: um `postLd` por bloco com código (`folhasDoTomo: bloco.ids, respeitarOrdem: true, numTomos: 1, tomoAtual: 0, editavel: true, rede`), nome `nomeDaLd(codigo, bloco.codigo, revisao)`; disciplina única: como hoje, com `editavel: true`.

- [ ] Commit `Editáveis: uma LD por disciplina no volume misto`.

### Task 7: memória da obra

**Files:** Modify `app/api/nexo/obra/route.ts` (resposta ganha `rede: string | null` = `data.decisoes.caminhoDaRede.valor` da conversa mais recente que a tenha), `PerguntaDaRede`/`PlanoDeGeracao` (sem decisão própria e com `rede` da obra: decide com ela; se `revisao` difere, sem `emissao`/`porDisciplina[*].emissao`).

- [ ] Commit `Caminho da rede: o volume seguinte parte do anterior`.

### Task 8: prova de ponta a ponta

- [ ] Gerar LD no dev, extrair o rodapé do PDF com pdfjs (script da medição) e ver `P:\cad\…\<nome>_ld_a.odt   Pág.1`.
- [ ] Baixar o ZIP de um volume misto: uma LD por disciplina, cada uma com `text:file-name` no `styles.xml`.
- [ ] Rodar `node scripts/test-caminho-da-rede.ts`, `node scripts/test-rodape-com-caminho.ts`, `node scripts/test-nexo-decisoes.ts`, `npx tsc --noEmit`.
- [ ] Push.
