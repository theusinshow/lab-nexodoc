# Memorial sem capa — identidade por escada de fontes

Data: 09/10/2026. Status: desenho aprovado.

## Problema

O usuário de uma disciplina (estrutural, elétrico…) anexa **só o memorial dele**.
A capa mora no memorial GERAL, que outra pessoa anexa depois — ou nunca. Sem
página 1 com timbre, `lerCapa` devolve `null` e a identidade cai na leitura
solta do corpo (`lib/audit-classify.ts`: rodapé, campo "Obra:", regex de código
e município) — o mesmo caminho que deu "• Diário de Obra em dia" como obra no
027-24. A régua da auditoria fica com o elo mais fraco.

Às vezes o projeto já existe no NexoDoc (pranchas, outra auditoria, volume),
às vezes o memorial de disciplina é o primeiro arquivo. O desenho cobre os dois.

## Decisões

1. **Escada de fontes por campo**, com procedência visível.
2. **O usuário pode preencher/corrigir** qualquer campo na ficha — é o degrau
   mais alto na conversa.
3. **Quando o geral chega, a capa vira a verdade do projeto.** As auditorias
   de disciplina anteriores ganham conferência determinística, sem reauditar.
4. **Conflito usuário × capa do geral: a capa vence e avisa.** O valor digitado
   não é apagado; vira divergência registrada.

## 1. A escada (por campo)

Campos: obra, órgão, secretaria, bairro, município, código, data (os de
`CAMPOS_DO_MEMORIAL`).

```
1. usuario   — digitou ou corrigiu na ficha desta conversa
2. capa      — página 1 do próprio memorial (lerCapa)
3. projeto   — Project.identidade, achado pelo código do nome do arquivo
4. corpo     — rodapé / "Obra:" / caracterização (nomeDaObra etc.)
5. vazio     — linha aberta na ficha
```

- **Não contradiz a decisão 4.** Esta escada é da FICHA desta conversa: a
  correção do usuário vence a leitura do próprio documento sob suspeita (como
  já funciona hoje). A decisão 4 é do PROJETO: a capa do geral, documento
  oficial que chegou depois, vence o que foi digitado antes (seção 3). Uma
  conversa aberta depois do geral recebe a capa pelo degrau 3.
- O **código** continua vindo do nome do arquivo (chave do projeto); é ele que
  acha o `Project` do degrau 3. Sem código no nome, o degrau 3 é pulado.
- Função pura nova `identidadeDoMemorial(args)` em `lib/` — sem `@/`, testável
  em node cru — devolvendo `{ [campo]: { valor, origem } }`.
  `identidadeDoParecer` passa a consumi-la (hoje faz gabarito > capa > inferido
  sem o degrau do projeto).

## 2. A ficha do memorial

`modules/nexo/lib/ficha-do-memorial.ts` já tem linhas corrigíveis
(`corrigido`), correção indo ao dossiê (régua da auditoria) e à identidade do
projeto (`patchDaIdentidade`). Muda:

- `LinhaDoMemorial` ganha `origem: "usuario" | "capa" | "projeto" | "corpo" | null`
  (`corrigido` vira `origem === "usuario"`; manter o campo por compatibilidade
  com fichas já gravadas em conversas).
- A linha diz de onde veio: "do projeto 141-26", "do rodapé — confirme",
  "você preencheu".
- Valor de origem `corpo` é **sugestão**, mostrada como a confirmar.
- Linha vazia fica aberta para digitar, com o rótulo "a capa vem no geral;
  preencha se souber". Preencher **não é obrigatório**: a auditoria roda com o
  que houver e o cartão diz que a régua está incompleta.
- O texto do cartão de auditoria sobre a procedência da obra (hoje "do carimbo"
  × "do próprio memorial") ganha os casos "do projeto" e "preenchida por você".

## 3. Onde a identidade fica guardada

Hoje `Project` só tem `code`, `name`, `client`, `clientKey`.

- Coluna nova `Project.identidade Json @default("{}")`:

  ```ts
  type CampoGuardado = {
    valor: string;
    origem: "capa" | "selo" | "usuario";
    fonte: string;      // "141_26_geral.pdf p.1"
    em: string;         // ISO
    por?: string;       // userId, quando origem = usuario
  };
  type IdentidadeDoProjeto = {
    campos: Partial<Record<CampoDoMemorial, CampoGuardado>>;
    divergencias: Array<{ campo; anterior: CampoGuardado; nova: CampoGuardado; em: string }>;
  };
  ```

- `name` e `client` continuam e passam a ser **derivados** da identidade ao
  gravar (home, barra, `clientKey` e cor da prefeitura não mudam de fonte).
- Regra de escrita, função pura `gravarIdentidade(atual, campo, novo)`:
  - `capa` sobrescreve qualquer origem. Se a anterior era `usuario` (ou `selo`)
    e o valor diverge (`mesmaObraPorTokens` para obra; igualdade normalizada nos
    demais), empilha em `divergencias`.
  - `selo` e `usuario` só preenchem campo vazio, ou substituem um ao outro
    (`usuario` sobre `selo` sim; `selo` sobre `usuario` não). Nunca sobre `capa`.
  - `corpo` **nunca grava** no projeto.
- `patchDaIdentidade` (correção na ficha) passa a gravar via
  `gravarIdentidade(origem: "usuario")`.

## 4. Quando o geral chega

1. O geral é classificado; `lerCapa` lê a capa; para cada campo lido,
   `gravarIdentidade(origem: "capa", fonte: arquivo p.1)`.
2. Para cada auditoria anterior do mesmo `Project`, compara a régua com que ela
   rodou com a identidade nova — **determinístico, sem IA**
   (`mesmaObraPorTokens` na obra). Grava em
   `Project.identidade.conferencias[auditId] = { estado: "confere" | "diverge", obraDaAuditoria, obraDaCapa, em }`
   — e não dentro de `Audit.report`: um lugar de escrita só, e o parecer
   continua imutável. Auditoria sem entrada ali não foi conferida.
3. Divergência aparece:
   - na fala do Nexo logo após o geral: "A capa do geral diz *X*; a auditoria
     estrutural de 03/10 foi feita com *Y*.";
   - no cabeçalho do parecer antigo, como selo.
4. Nada é reauditado. "Auditar de novo" (já existe) é a saída manual.

## 4b. O caso real que fixa o desenho: 040-26

Disciplina `P:\cad\prefchap\040_26\estrutural_concreto\documentos\Memorial\040_26_est_md_a.pdf`
(6 páginas; a página 1 é só "1 PROJETO ESTRUTURAL", separadora de capítulo).
Geral: `docs/samples/040-26/1_memorial/040_26_md_geral_a.pdf`.

| campo | disciplina hoje (corpo/rodapé) | capa do geral |
|---|---|---|
| obra | Feira Comercial de Chapecó | REVITALIZAÇÃO DA FEIRA MUNICIPAL DE CHAPECÓ |
| código | **125-23** (regex do rodapé) | 040-26 |
| órgão | — | PREFEITURA MUNICIPAL DE CHAPECÓ |
| município | — (Chapecó está no rodapé e não é lido) | Chapecó |
| secretaria | — ("Sec. de Planejamento e Desenvolvimento" no rodapé) | SECRETARIA DE PLANEJAMENTO E DESENVOLVIMENTO |

O rodapé da disciplina foi herdado do projeto 125-23. Consequências no desenho:

- **Código:** `audit-classify` pega o primeiro `\d{2,4}[_-]\d{2}` do texto e
  devolveu 125-23. Na escada, o código é SEMPRE o do nome do arquivo; código
  diferente achado no corpo vira **sinal** ("o rodapé cita 125-23"), igual a
  `divergenciaDeCodigo` faz com a capa.
- **Corpo é sugestão**, nunca fato: aqui ele erra a obra *e* o código.
- **Conferência retroativa** precisa dizer `diverge` neste par ("Feira
  Comercial de Chapecó" × "Revitalização da Feira Municipal de Chapecó"). Se
  `mesmaObraPorTokens` disser que confere (Feira + Chapecó em comum), o teste
  mostra e a regra é ajustada para este caso antes de seguir.
- O PDF de disciplina entra em `docs/samples/040-26/estrutural_concreto/` (pasta
  ignorada pelo git, como os demais samples); os testes leem dali e pulam com
  aviso se o arquivo não existir.

## 5. Fora do escopo

- Reauditoria automática.
- OCR de capa em imagem.
- Ação inline de escolher o projeto para conversa "A endereçar" (sub-projeto 4).
- Endereço como campo da escada (continua vindo da caracterização, como hoje).

## 6. Testes (sem token)

- `test:identidade-sem-capa` — a escada: os 5 degraus por campo, código ausente
  pula o projeto, corpo nunca sobe acima de projeto.
- `test:gravar-identidade` — capa sobrescreve usuário e registra divergência;
  usuário não sobrescreve capa; selo não sobrescreve usuário; corpo não grava.
- Conferência retroativa: auditoria com régua X + capa Y → `diverge`; X ≈ Y por
  tokens → `confere`.
- Fixture: memorial real de disciplina sem página 1 (um dos 15 memoriais
  versionados com a capa cortada, ou um enviado pelo usuário).
- Prova no navegador (build de produção, ver nexodoc-manifesto-recarrega-dev):
  subir a disciplina → ficha mostra "do projeto" e linhas vazias abertas;
  corrigir um campo → "você preencheu"; subir o geral com capa diferente →
  fala de divergência + selo no parecer antigo.
