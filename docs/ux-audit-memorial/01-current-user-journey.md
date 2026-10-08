# 01 — A jornada atual do Audit de Memorial

Rodada de diagnóstico. Data: 07/10/2026, na `main` local (649f09df, com alterações não commitadas em `visor.tsx`, `NexoChat.tsx` e outros arquivos, que não mexem no fluxo descrito aqui).

## Como esta auditoria foi feita

| Fonte | O que cobre | Confiança |
|---|---|---|
| **Execução real** no dev (`http://localhost:3400`), Chromium headless, 1440×900, login dev | Painel → Nexo → soltar memorial → ficha → cartão → auditoria real do `990_26_md_bateria_a.pdf` (49 s, US$ 0,00 cobrado: cota da OpenAI) → F5 no meio → resultado nas 5 leituras → exceções (não-PDF, prancha, sem código, páginas mudas) → Achados, Ajuda, "Continuar" | **Alta**: capturas e texto da tela guardados em `scratchpad/ux-audit/f1`, `f2`, `f3` (fora do git: mostram tela logada) |
| **Leitura do código** | Rótulos, condições de exibição, atalhos, componentes órfãos, gatilho do tour | **Alta** para "existe/não existe", **média** para comportamento sob condições não exercitadas |
| **Simulação das personas** | Doc 02–04 | **Inferência**. Não houve teste com pessoas reais. Nenhum tempo ou taxa de sucesso aqui é medido em gente. |

**Limite de método:** os três perfis foram percorridos por um único analista, em sequência, e não por agentes independentes. A regra do projeto proíbe subagentes. A independência foi preservada só por disciplina: cada perfil foi escrito antes da revisão cruzada (doc 10). Isso reduz a diversidade real de leitura, e convém lembrar ao ponderar consensos.

Scripts reprodutíveis: `scratchpad/ux-audit/fase1.mjs`, `fase2.mjs`, `fase3.mjs` (rodar com `OUT=<pasta> node <script>`; a fase 2 dispara uma auditoria paga).

## O que o módulo é de verdade (hipótese do pedido × realidade)

Não existe um "módulo Audit" com páginas próprias. `/audit` só redireciona (`app/audit/page.tsx:39`). **A auditoria vive dentro de uma conversa do Nexo** (`/nexo`): coluna de conversas | palco | chat. Isso é decisão de produto registrada ("o Nexo é um chat que audita").

| Etapa da hipótese | Existe? | Onde |
|---|---|---|
| 1. Acessar | Sim, por 8 portas (ver abaixo) | Painel, Topo, Achados, Projetos, Ctrl K |
| 2. Iniciar | Sim | `PARTIDAS` (`modules/nexo/lib/partidas.ts`) |
| 3. Selecionar/cadastrar projeto | **Automático**; manual só quando o código não resolve | `vincularProjetoDaConversa` (`NexoWorkspace.tsx:1066`); seletor no cartão (`ConfirmationCard.tsx:3001`) |
| 4. Enviar documento | Sim (1 PDF, arrastar ou escolher) | `readSelos` (`NexoWorkspace.tsx:1121`) |
| 5. Configurar parâmetros | **Não há**: nível fixo "deep", escolha só de transcrever páginas mudas | `app/api/nexo/agent/route.ts:258-261` |
| 6. Iniciar processamento | Sim, depois de 3 confirmações | `ConfirmationCard.tsx:2909-2935` |
| 7. Estados de processamento | Sim, muito bom | `AuditoriaEmCurso.tsx`, linha do tempo |
| 8. Ver resultado | Sim, 5 leituras | `components/telas/resultado/resultado.tsx:37` |
| 9. Entender achados | Sim | `fila-a/pecas.tsx` (`Partes`, `Evidencias`) |
| 10. Localizar no documento | Sim (visor de PDF, "No documento") | `visor.tsx`, `no-documento.tsx` |
| 11. Revisar/classificar | Sim (Corrigido, Decisão técnica, Falso positivo, voto na IA) | `pecas.tsx:929-1016`, `557-640` |
| 12. Atribuir | Sim, em 4 lugares | ver doc 05 |
| 13. Salvar | **Automático** a cada ação (rota feedback) | `use-parecer-vivo.ts` |
| 14. Retomar | Sim (Painel "Continuar", barra lateral, F5) | `use-reconectar-auditoria.ts` |
| 15. Histórico | Sim (barra lateral filtrável; `/achados` só para achados) | `HistoricoDeConversas.tsx` |
| 16. Exportar/compartilhar | **Só "Parecer em PDF"** e "Copiar link do achado"; e-mail aos responsáveis | `trilho.tsx:184`, `pecas.tsx:230` |
| 17. Concluir | **Não há "concluir"**: o anel "x de y tratados" fecha quando tudo foi tratado | `trilho.tsx:136` |

## A jornada real, passo a passo (caminho feliz, medido)

Ponto de partida: Painel (`/`), usuário que já usou o produto.

| # | Objetivo | Ação | Resultado real (observado) | Interações | Pontos de dúvida |
|---|---|---|---|---|---|
| 1 | Começar | Clicar "Auditar um memorial" no Painel | Vai a `/nexo?intencao=auditar`: orbe grande, "Vamos auditar um memorial. Me manda o memorial em PDF.", zona "Escolher o memorial" (f1/03) | 1 | Três chips ("Montar um volume", "Auditar…", "Conferir…") repetem a escolha já feita |
| 2 | Enviar | "Escolher o memorial" + escolher no diálogo do sistema | "Anexei o memorial", ficha com 7 linhas e lápis em cada uma (f1/06) | 2 | Palco grande e vazio com abas **"Obra / Volume"**, "Volume" selecionada |
| 3 | Conferir a obra | Ler a ficha; corrigir no lápis se preciso | Selo "confira" no nome da obra | 0–n | O texto pede conferir "principalmente o NOME DA OBRA", mas não diz o que fazer quando está certo |
| 4 | Pedir a auditoria | "Auditar o memorial" | Escreve "audita o memorial" como fala do usuário; Nexo responde **sem IA** em 0,1–0,4 s, mostrando "Pensou por 0,3 s", e traz o cartão "Proposta · Auditoria" **abaixo da dobra** (f1/07) | 1 (+ rolar) | O botão continua aceso; repetir cria um **segundo cartão** (f2/01) |
| 5 | Confirmar de novo | Ler o cartão (repete Obra, Prefeitura, Município; "Código" virou "Centro de custo") | "Auditar" desligado: "Marque 'Conferi os dados da obra' para liberar" | 0 | Os mesmos dados, segunda vez, com outro nome |
| 6 | Liberar | Marcar "Conferi os dados da obra" | Libera "Auditar" | 1 | Terceira confirmação da mesma coisa |
| 7 | Rodar | "Auditar" | Palco troca para a auditoria em curso: linha do tempo, decorrido, etapa, "Pode fechar a aba" (f2/05) | 1 | Sem código lido: só **aqui** aparece o seletor de projeto (+2) |
| 8 | Esperar | — | 49 s neste PDF de 3 páginas; F5 no meio reconecta ("Esta análise já estava rodando no servidor", f2/07) | 0 | Depois do F5: "Enviando o documento para análise…" aos 46 s (contraditório) |
| 9 | Ver resultado | — | Palco abre no **Resumo** (por disciplina, onde estão, falta tratar 5); trilho com **6 ícones sem rótulo**; chat ganha a fala "Auditei… Revisar antes de emitir. 5 achados…" (f2/08) | 0 | O veredito escrito **não aparece no palco**: só um ponto âmbar no anel |
| 10 | Tratar | Ícone de Achados (ou "Abrir a fila") → J/K → Marcar corrigido / Decisão técnica / Falso positivo | Fila + detalhe; a 1440 px o detalhe **corta** "Decisão técnica" e "Falso positivo" (f2/11) | 1 + 1 por achado | Badge "2" ao lado de "Abrir a fila" é atalho de teclado, não contagem |
| 11 | Levar adiante | Ícone "Parecer em PDF" | Abre numa aba nova | 1 | Único formato de exportação na tela |

**Caminho feliz, contagem confiável:** Painel → auditoria rodando = **6 interações** (1 tarefa, 2 escolher o arquivo, 1 "Auditar o memorial", 1 marcar, 1 "Auditar"), mais 1 rolagem para achar o cartão. Sem código lido: **8**.

## As 8 portas de entrada (todas levam ao mesmo lugar)

| Porta | Rótulo | Arquivo |
|---|---|---|
| Painel, tarefa | "Auditar um memorial" | `tela-painel.tsx:33` |
| Painel, soltar arquivo | "Solte o memorial para auditar" | `tela-painel.tsx:111` |
| Barra de comando / Ctrl K | "Auditar um memorial" | `barra-de-comando.tsx:59` |
| Nexo, saudação | chip "Auditar um memorial" | `partidas.ts:57` |
| Nexo, zona de soltar | "Escolher o memorial" | `partidas.ts:66` |
| Achados | "Nova auditoria" | `tela-achados.tsx:226` |
| Projetos e Projeto | "Auditar documentos" | `tela-projetos.tsx:172`, `app/projetos/[id]/page.tsx:112` |
| Link legado | `/audit?project=` | `app/audit/page.tsx` |

Ter várias portas é bom; o problema é que cada uma tem um **nome diferente**. Ver doc 05, R1.

## Estados e transições do palco

```
saudação (orbe) ──soltar PDF──▶ conversa + palco vazio "Obra|Volume"
   ──"Auditar o memorial"──▶ cartão de proposta (chat)
   ──marcar + Auditar──▶ palco: auditoria em curso  ──(F5)──▶ "Rodando no servidor" (reconectada)
   ──fim──▶ palco: Resultado [Resumo | Achados | Relatório | No documento | (anel) Resumo completo]
                       └─ visor do PDF por cima ("Ver no memorial", M)
```

## O que existe, o que está acessível, o que está morto

| Item | Estado | Evidência |
|---|---|---|
| `AuditCanvas.tsx` (576 linhas) | **Órfão**: nenhum import vivo | grep: só `layout-auditoria.ts` e o inventário do lab |
| `components/audit-result.tsx` (`AuditResult`) | **Órfão como tela**; tem os únicos "Exportar / Copiar achados / Copiar ações / Baixar .md" e a aba "Tratamento" | grep `"Copiar achados"` |
| `components/telas/resultado/fila.tsx` (1.069 linhas) | Vivo só pelo `Trecho` | `fila-a/pecas.tsx:19` |
| Passo do tour "parecer-completo" | Aponta para `[data-tour="abrir-parecer"]`, que só existe no `AuditCanvas` órfão | `passos-do-tour.ts`, grep |
| Vista "geral" (Resumo completo) | Acessível **só** pelo anel do trilho; o atalho 1–4 não a alcança | `resultado.tsx:110-118` |
| Teclas 1/2/3/4, J/K, C/D/F, M, Z | Implementadas; só aparecem em dicas e rodapés | `resultado.tsx`, `pecas.tsx` |
| Testes do módulo | Bateria cobre robustez (a1–a6: F5, repetida, folhas mudas, sem código); **nenhum teste de experiência** | `scripts/bateria/jornadas/auditoria/` |
| Doc anterior | `docs/15-auditoria-ui-ux.md` (auditoria UX/UI de agosto) | — |
