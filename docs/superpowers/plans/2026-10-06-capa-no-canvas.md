# Capa no canvas antes de gerar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** §7 de `docs/superpowers/specs/2026-10-06-canvas-da-montagem-design.md`: antes de gerar, o canvas divide em tomos e mostra a capa (frame editável, campos destacados) no lugar dos documentos; "Confirmar e gerar" no cabeçalho; chips de volume saem do chat.

**Architecture:** O `PlanoDeGeracao` já publica o gerar (`PublicarGeradorDoPlano`). Ele passa a publicar também o FRAME (layout, prefeitura, valores, derivados, destaques, numTomos, `onChange`). O canvas lê `useGeradorDoPlano().gerador.frame` e desenha um nó `capaPrevia` por fileira com o `FrameDoDocumento`, que ganha `destaques` e `opcoes`. Regra dos destaques e da frase do cabeçalho: puras e testadas.

**Global Constraints:** uma fonte para as decisões (o `aoEditarNoFrame` do plano); sem lib nova; pt-BR; commit na `main` com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`; push só com o ok do Matheus.

### Task 1: Regras puras
- `modules/nexo/lib/destaques-do-frame.ts`: `destaquesDoFrame({ campos, valores, derivados, faltas })` → `Record<marcador, "falta" | "sugerido">` (falta vence; sugerido = editável com derivado e sem valor decidido; derivados fixos e campos com valor não destacam).
- `trilho-do-tomo.ts`: com gerador travado, a frase vira `N folhas · <bloqueio até o " — ", minúsculo>`; o rótulo da ação "gerar" é "Confirmar e gerar" (no componente).
- Testes: `scripts/test-nexo-destaques-do-frame.ts`, casos novos em `test-nexo-trilho-do-tomo.ts`.

### Task 2: Frame com destaques e opções
- `FrameDoDocumento`: props `destaques?` (âmbar sólido / violeta tracejado) e `opcoes?: Record<marcador, string[]>` (botões que chamam `onChange(marcador, v)`).

### Task 3: O plano publica o frame
- `SituacaoDoGerador.frame?: FrameDoPlano` (dados + `versao` para comparar); `onChange` por ref.
- `PlanoDeGeracao`: monta o frame (os mesmos `layoutDoModelo`, `valoresDoFrame`, derivados, `prefeitura`) + `faltas` (VOLUME com `motivoDoVolume`, TITULO_CAPA com `semTitulo`) e passa a `PublicarGeradorDoPlano`.

### Task 4: Canvas
- Sem capa nem LD e com `frame`: declarados = `frame.numTomos`; nó `capaPrevia` (frame `nodrag nopan nowheel`, 320 px) no lugar da capa; TOMO por fileira; `opcoes.VOLUME = ["1","2","3","4"]` quando falta.
- Cabeçalho: "Confirmar e gerar".
- Chat: `QuickReplyChips` não aparece para `slotRequest.slotId === "volume"`.

### Task 5: Prova no navegador (040-26 EST, 16 folhas, sem nada gerado) e commit.
