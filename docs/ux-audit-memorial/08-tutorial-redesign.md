# 08 — Novo tutorial (orientação contextual)

## Diagnóstico do tour atual

| Aspecto | Hoje | Evidência |
|---|---|---|
| Gatilho | Automático, na montagem do Nexo, se não há `nexo:tour-visto` no navegador e a lista de conversas está vazia **naquele quadro** | `NexoWorkspace.tsx:2140-2170` |
| Comportamento real | Abriu para um usuário com 48+ conversas, sobre `?intencao=auditar`, e seguiu aberto nas telas seguintes | f3/06–11 (1 de 3 navegadores limpos) |
| Conteúdo | 11 passos; 5 sobre volume (selo, mapa, pilha); 1 com alvo morto (`abrir-parecer`) | `passos-do-tour.ts` |
| Método | Demonstração: clica sozinho em chips do palco sobre um projeto fictício | campo `clicarAntes` |
| Efeito colateral | Cria "Exemplo guiado — Escola Municip…" na barra lateral | f3/08 |
| Refazer | "Como funciona o Nexo", no rodapé da barra lateral | `NexoSidebar.tsx:133` |

**Conclusão:** o tour tenta compensar três problemas de interface (o palco vazio, as confirmações repetidas, o resultado em ícones) explicando-os. Depois do doc 07, a maior parte do que ele explica deixa de precisar de explicação.

## O que é da interface e o que é do tutorial

| Dúvida | Resolver na interface (doc 07) | Precisa de orientação |
|---|---|---|
| "Onde mando o arquivo?" | Convite + zona de soltar (já resolve) | — |
| "Por que conferir a ficha?" | Uma frase fixa na ficha: "É por este nome que o Nexo reconhece texto de outra obra" | — |
| "Começou?" | Cartão único, sem rolagem | — |
| "Posso emitir?" | Faixa do veredito | — |
| "O que é decisão técnica × falso positivo?" | Dicas nos botões | **Sim**, na primeira revisão (é conceito, não interface) |
| "Corrigido no sistema corrige o PDF?" | Dica | **Sim**, uma vez: "Marcar corrigido registra; quem corrige o PDF é você" |
| "Atribuir avisa?" | Estado do aviso no achado (U19) | — |
| "Tem atalho?" | `?` | **Sim**, uma vez, para quem tratou 3 achados com o mouse |

## Roteiro novo: 5 momentos, nenhum obrigatório, todos ligados a uma tarefa real

Regras gerais:
- **Nada abre sozinho na primeira tela.** Não há tour automático.
- Cada dica aparece **no momento em que a pessoa está fazendo aquilo**, uma vez por pessoa. **Não existe hoje modelo de preferência por usuário** no `prisma/schema.prisma` (só `User` e configurações da plataforma). Guardar no servidor exige uma coluna nova em `User` (ex.: `dicasVistas Json`), que é migração de banco. Sem ela, fica em `localStorage`, com a limitação atual: um navegador novo repete as dicas. Decisão de custo: ver doc 10, D4.
- Cada dica se fecha com "Entendi" ou some sozinha quando a pessoa faz a ação que ela ensina.
- Nenhuma dica cobre o alvo; nenhuma bloqueia clique (o tour atual bloqueia o compositor: ver a memória `dirigir-o-nexo-no-playwright`).
- Todas reaparecem em "Como funciona o Nexo → Rever as dicas da auditoria".

### M1 — Estado vazio educativo (primeira conversa com tarefa "auditar")
- **Tela:** saudação com `intencao=auditar`, zona de soltar.
- **Condição:** a pessoa nunca rodou auditoria (contagem no servidor = 0).
- **Texto (dentro da zona, não balão):**
  > **Como funciona:** você manda o memorial, confere a obra que o Nexo leu na capa, e ele audita o texto inteiro contra ela. Leva de 1 a 5 minutos. Você pode fechar a aba.
  > Não tem um memorial à mão? **[Usar um memorial de exemplo]**
- **"Usar um memorial de exemplo"** (substitui o projeto de exemplo do tour): anexa um PDF de exemplo **sem rodar a IA**, abre a ficha e, ao clicar "Conferi — auditar", abre um parecer pronto marcado "Exemplo" (a conversa some ao sair, como hoje). É aprender fazendo o caminho real.
- **Some:** depois da primeira auditoria real.

### M2 — Na ficha (primeira vez)
- **Gatilho:** a ficha aparece pela primeira vez para a pessoa.
- **Âncora:** a linha "Obra".
- **Texto:**
  > Confira principalmente o **nome da obra**. É por ele que o Nexo descobre trecho copiado de outro projeto. Errado? Corrija no lápis antes de auditar.
- **Some:** ao clicar "Conferi — auditar" ou em qualquer lápis.

### M3 — Durante o processamento (primeira vez)
- **Gatilho:** primeira auditoria em curso.
- **Lugar:** dentro do painel de processamento, abaixo da linha do tempo (não balão).
- **Texto:**
  > Enquanto lê: o Nexo procura nome de outra obra, contradições entre capítulos e referências que não existem. Um segundo modelo confere cada ponto antes de entrar no parecer.
- **Some:** ao terminar.

### M4 — Primeira revisão de achados
- **Gatilho:** a pessoa abre "Achados" pela primeira vez.
- **Âncora:** o grupo de botões "Encerrar o achado".
- **Texto (3 linhas, uma por botão):**
  > **Marcar corrigido**: você vai corrigir (ou já corrigiu) o memorial. O PDF não muda sozinho.
  > **Decisão técnica**: o projeto segue assim de propósito. O motivo vai no parecer.
  > **Falso positivo**: a IA errou. Isso ensina o motor.
  > *Tudo se desfaz: Z logo depois, ou "Reabrir".*
- **Some:** depois do primeiro achado encerrado.

### M5 — Atalhos, para quem já está rápido
- **Gatilho:** a pessoa encerrou 3 achados com o mouse na mesma sessão.
- **Lugar:** aviso discreto no rodapé da fila (onde já ficam "J K andam").
- **Texto:**
  > Dá para ir mais rápido: **J/K** andam, **C/D/F** encerram, **M** abre o PDF. **?** mostra todos.
- **Some:** ao usar qualquer atalho, ou com "Entendi".

### Ajuda sob demanda
- **Ajuda** (`/ajuda`): reescrever "Auditar", "Tratar" e "Levar" contra a tela viva; um teste confere cada rótulo citado (U04).
- **`?` no resultado:** a lista de atalhos.
- **"Como funciona o Nexo"**: deixa de iniciar o tour; abre um painel com os 5 momentos (rever qualquer um) e "Usar um memorial de exemplo".

## O que sai

- O tour automático de 11 passos e o semeador do projeto de exemplo **no primeiro acesso**.
- Os passos de volume vão para as dicas da tarefa "Montar um volume" (fora do escopo desta auditoria; não apagar sem desenhar o equivalente).
- O passo com alvo morto (`abrir-parecer`).

## Critérios de aceitação do tutorial

1. Em navegador limpo, qualquer URL do Nexo abre **sem** balão.
2. Nenhuma conversa "Exemplo guiado" nasce sem clique em "Usar um memorial de exemplo".
3. Cada momento aparece no máximo 1 vez por pessoa (por navegador, se D4 ficar sem migração).
4. Nenhuma dica bloqueia clique ou digitação (`pointer-events` no alvo intacto; a jornada da bateria digita com a dica aberta).
5. Todo rótulo e tecla citados nas dicas e na Ajuda existem na tela (teste automático).
6. O exemplo não gasta IA (parecer de exemplo gravado, como o `exemplo-auditoria` atual).
