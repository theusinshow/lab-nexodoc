# Prompt para colar no Claude Code

Abra o Claude Code na raiz do repositório NexoDoc e cole o texto abaixo. O pacote solicita implementação e validação local completas, não uma nova auditoria ou somente um plano.

```text
Quero que você implemente integralmente as melhorias da auditoria de UX/UI do NexoDoc, com prioridade para montagem de volumes e páginas de achados, preservando todas as capacidades existentes e tornando cada função encontrável.

Leia primeiro:
1. docs/auditoria/execucao-ux-ui-claude-code/README.md
2. docs/auditoria/execucao-ux-ui-claude-code/PROGRESSO.md
3. docs/auditoria/auditoria-ux-ui-2026-09-27.md
4. docs/auditoria/inventario-funcional-ux-ui-2026-09-27.md
5. docs/auditoria/evidencias-ux-ui-2026-09-27.md
6. DESIGN.md e as instruções locais aplicáveis ao checkout.

Sua missão é executar os 31 itens, P1 e P2, nas seis etapas do documento. Não pare após analisar, criar outro plano, implementar uma tela ou concluir a primeira etapa. Prossiga entre as etapas sem me pedir confirmação rotineira. Tome decisões locais fundamentadas e registre-as.

Este trabalho é de UX/UI e integração dos fluxos. Não o confunda com docs/auditoria/execucao-claude-code/, que é o pacote anterior do motor. Não reescreva a arquitetura do motor, seus prompts, vereditos ou regras de custo para resolver problemas da interface. Integrações de rotas, fontes, persistência e APIs necessárias aos critérios de aceite fazem parte da tarefa.

Preserve alterações preexistentes e funções já entregues. Preserve chat, identidade visual, geração de LD/capa/separatriz/volume, revisão de folhas, decisões técnicas, histórico e controles de acesso. Use o inventário como proteção contra regressão de capacidade. Nenhuma função frequente deve depender exclusivamente de hover, arrastar, atalho de teclado ou saber a frase exata para pedir ao chat.

Não aceite soluções superficiais: montagem recuperável precisa conservar arquivos e ordem; escolha de destino precisa funcionar no segundo volume/grupo; links precisam preservar projeto e achado; evidência precisa abrir documento e revisão corretos; erro não pode virar sucesso; botão com helper desconectado não é entrega.

Trabalhe em fatias completas: reproduzir, implementar, integrar, testar e verificar no navegador. Valide 1920x1080, 1440x1000, 1280x800, 390x844, teclado e zoom de 200% nos percursos indicados. Use fixtures e ambiente de teste; não faça chamadas pagas, envios reais de e-mail, alterações de dados reais ou publicação para demonstrar a UI. Leia os efeitos dos scripts antes de executá-los.

Atualize PROGRESSO.md com status por ID, arquivos alterados, testes realmente executados, evidências e próxima ação. Se a sessão/contexto terminar, deixe uma retomada precisa e continue desse ponto quando retomado, sem recomeçar a auditoria. Um bloqueio deve ser concreto; avance no restante independente e nunca declare concluído o que não foi verificado.

No fechamento, execute lint, build e testes pertinentes, reconcilie todas as capacidades do inventário e entregue RELATORIO-DE-EXECUCAO.md com a matriz dos 31 itens, evidências visuais, resultados reais e limitações. Atualize o changelog. Não trate screenshots, testes de strings ou um layout bonito como prova suficiente de funcionamento.

Comece agora pela inspeção do checkout e pela primeira tarefa executável da etapa 1, ou pelo ponto de retomada já registrado se houver progresso.
```

## Prompt curto para retomar depois

```text
Continue a implementação de UX/UI do NexoDoc a partir de docs/auditoria/execucao-ux-ui-claude-code/PROGRESSO.md, seguindo o README.md desse mesmo pacote. Confira o checkout atual e retome a próxima ação registrada. Preserve alterações existentes; não refaça a auditoria nem confunda este trabalho com o pacote do motor. Continue pelas etapas restantes e só marque como concluído o que estiver integrado e verificado.
```
