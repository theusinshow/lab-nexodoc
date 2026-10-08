# 07 — Fluxos propostos

Princípios, todos tirados de decisões já registradas no projeto:
1. **O Nexo é um chat que audita.** Toda tela de trabalho é palco de uma conversa.
2. **Uso pontual.** Entra, faz uma tarefa, sai. Nada de painel de acompanhamento.
3. **Nada roteirizado.** Movimento só em resposta a gesto (sem tour com câmera sozinha).
4. **Conferir antes de gastar.** A garantia do 141-26 fica, com menos gestos.
5. **Simplificar antes de adicionar.** Nenhum fluxo abaixo cria tela nova; todos removem ou fundem.

## F1 — Começar: da ficha direto à auditoria (6 → 2 interações)

```
HOJE                                             PROPOSTO
Painel: Auditar um memorial            (1)       Painel: soltar o PDF na tarefa       (1)
Nexo: Escolher o memorial + diálogo    (2)          — ou — tarefa (1) + escolher (2)
ficha no chat                                    ficha no chat, palco mostra a capa
"Auditar o memorial"                   (1)       ┌ ficha ───────────────────────────┐
fala falsa + "Pensou por"                        │ Obra · Prefeitura · Município ·  │
cartão abaixo da dobra (repete dados)            │ Código  (lápis em cada uma)      │
rolar                                            │ [se faltar código] Projeto: [▾]  │
marcar "Conferi os dados da obra"      (1)       │ [se houver base] Só os capítulos │
"Auditar"                              (1)       │   alterados serão relidos · não  │
[sem código: escolher projeto + botão] (2)       │ [se houver páginas mudas] aviso  │
                                                 │ Deve levar ~1 min. Pode fechar.  │
                                                 │ [ Conferi — auditar ]  (1)       │
                                                 │ [ Auditar sem transcrever ] (mudas)│
                                                 └──────────────────────────────────┘
```

- **O que some:** a sugestão "Auditar o memorial", a fala fabricada, a resposta fixa do servidor (`ehOPedidoDoBotao`), o cartão "Proposta · Auditoria" no estado "antes de rodar", a caixa de seleção.
- **O que fica:** a conferência explícita (o botão tem o verbo "Conferi"), a escolha de projeto antes de gastar, a comparação com a base recusável, o portão das páginas mudas, a estimativa.
- **Pedido por texto:** quem escreve "audita o memorial" no chat recebe a mesma ficha rolada à vista (o agente não cria cartão novo).
- **Risco:** o cartão de auditoria é o dono do `idDaAuditoriaDaProposta` (o id do resultado nasce da mensagem da proposta) e da reconexão. A ficha passa a ser essa mensagem. **Mexe em `auditoria-da-proposta.ts`, na migração de conversas antigas e nas jornadas a1–a6 e x2 da bateria.** É a mudança mais arriscada do plano.

## F2 — Esperar (mantém, com 3 ajustes)

O processamento é o melhor momento do produto. Só:
- Título e anel sem sobreposição (U23).
- Depois do F5, o rodapé não diz "Enviando o documento" (U22).
- "Análise profunda" sai (não há outra).

## F3 — Ler o resultado: 4 abas com nome e veredito fixo

```
┌ palco ─────────────────────────────────────────────────────────────┐
│ ● Revisar antes de emitir — 5 pontos pedem decisão técnica.        │  ← sempre visível
│   0 de 5 tratados · Auditado hoje 19:34 · 49 s    [Parecer em PDF ▾]│
│ [Resumo 1] [Achados 5 · 2] [Relatório 3] [No documento 4]           │  ← substitui "Auditoria | Mapa do volume"
├────────────────────────────────────────────────────────────────────┤
│ Resumo: falta tratar por nível · por disciplina · o que foi lido ·  │
│         linha do tempo (recolhida) · "3 páginas com achado →"       │
└────────────────────────────────────────────────────────────────────┘
```
- O trilho vertical de ícones some no palco (as abas o substituem). No resultado em tela cheia ele pode continuar com rótulos.
- "Resumo completo" deixa de ser uma leitura: o conteúdo vai para o Resumo.
- "Parecer em PDF ▾": PDF + "Copiar texto do parecer" (se D3 decidir por isso).
- "Perguntar ao Nexo" só quando o chat estiver oculto.
- **Risco:** o lab (`/lab/telas/resultado-e`) é a referência aprovada do trilho; mudar exige a aprovação dele (regra "não cortar o lab em silêncio").

## F4 — Tratar achados (mantém a fila; corta repetição)

- Fila + detalhe; abaixo de ~1500 px a barra de conversas recolhe sozinha ao abrir a fila.
- Atribuir: um componente (`Atribuidor`, com busca) na linha, no lote e no detalhe.
- Depois de atribuir: "Com Carla · não avisada · [Avisar por e-mail]".
- Atalhos: `?` lista; teclas em estilo de tecla, nunca de contador.
- Fim: quando tudo foi tratado, a faixa do veredito ganha a segunda linha (ver U26).

## F5 — Exceções

| Situação | Hoje (observado) | Proposto |
|---|---|---|
| Documento não-PDF | 500 mudo | "Este arquivo não é PDF. O Nexo audita o memorial em PDF." + mantém o convite |
| Prancha na tarefa de auditar | Oferece LD/capa | "Isto é prancha (carimbo EST 01/03), não o memorial. Me manda o memorial em PDF." Ofertas de volume ficam como secundárias |
| Memorial sem código | Seletor só depois de "Auditar" | Linha "Projeto" na ficha, antes do botão |
| Páginas mudas | Bom (dois botões, texto claro) | Mantém |
| Upload interrompido / leitura falhou | "Não consegui ler o memorial… continua anexado" (código, `NexoWorkspace.tsx:1706`) | Mantém; acrescentar "Tentar de novo" |
| Processamento demorado | Estimativa + "Pode fechar a aba" | Mantém |
| Sem achados | "Nenhum achado nesta auditoria… Se faltou apontar algo, conte abaixo" (`fila-a.tsx`) | Mantém |
| Muitos achados (53) | Fila com filtros por nível/disciplina/tipo | Mantém; a faixa do veredito ajuda a priorizar |
| Falha na auditoria | Aviso de auditoria incompleta + "Transcrever e auditar de novo" | Mantém |
| Sair no meio / F5 | Reconecta (observado) | Mantém; corrigir U22 |
| Voltar dias depois | "Continuar" abre o parecer (observado) | Chat rolado à fala final (U13); título legível no histórico (U12) |
| Ação equivocada (corrigido por engano) | "Desfazer (Z)" e depois "Reabrir" | Mantém; dizer "Z desfaz" no próprio aviso |
| Ação repetida | Proposta duplicada | Sugestão usada desliga; pedido repetido rola até a existente |
| Tarefa trocada no meio ("Nova conversa") | Perde o convite | Mantém a tarefa |

## Fluxo ideal, em uma linha por perfil

- **Iniciante:** Painel → "Auditar um memorial" → escolhe o PDF → lê a ficha com a capa ao lado → **"Conferi — auditar"** → acompanha → lê a faixa "Revisar antes de emitir" → abre "Achados" → trata → PDF.
- **Comum:** solta o PDF da revisão B na conversa da obra → ficha diz "só os capítulos alterados" → "Conferi — auditar" → aba Achados → J/C/D → atribui e avisa em um passo → PDF.
- **Avançado:** solta no Painel → Enter → `2` → `J C J C J D` → `?` quando esquecer.
