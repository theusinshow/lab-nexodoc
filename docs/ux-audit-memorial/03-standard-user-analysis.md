# 03 — Perfil 2: usuário comum (arquiteto / engenheiro / técnico)

**Persona:** profissional que audita memorial há anos, em papel ou PDF anotado. Sabe o que é incongruência de identidade e texto reaproveitado. Aprende uma ferramenta bem organizada em uma tarde. Quer previsibilidade: onde está o veredito, o que falta tratar, como mandar ao colega e à prefeitura, como voltar amanhã.

**Pergunta central:** o software acompanha naturalmente o processo de trabalho de um profissional?

**Resposta curta: o processo central acompanha bem (abrir → conferir a obra → rodar → tratar por nível → PDF). O que atrapalha é o que está em volta: a arquitetura do resultado tem leituras sobrepostas e escondidas, o histórico não se deixa escanear, e a exportação ficou pobre em relação ao que a Ajuda promete.**

## O processo dele × o que o software faz

| Processo do profissional | No NexoDoc | Encaixe |
|---|---|---|
| 1. Pegar o memorial da obra X | Painel → tarefa → PDF; o projeto se vincula sozinho pelo código | **Bom**. A vinculação automática (`vincularProjetoDaConversa`) é o que um profissional esperaria |
| 2. Conferir de que obra é | Ficha da capa com lápis por linha | **Bom**, mas repetido no cartão (S1) |
| 3. Ler e anotar | Auditoria de ~1 min (3 págs.) a ~4–5 min (memorial real) | **Bom**; a estimativa vem das últimas auditorias do navegador |
| 4. Separar o que impede emitir | Níveis: Bloqueia emissão / Exige decisão técnica / Texto | **Bom**, e o resumo agrupa por nível |
| 5. Ir à página do problema | "Ver no memorial, p. N" e tecla M; visor do PDF que vai sozinho ao grifo | **Muito bom** |
| 6. Mandar cada item a quem resolve | Atribuir; "Notificar por e-mail" à parte | **Confuso**: atribuir não avisa; quatro lugares para atribuir (S5) |
| 7. Registrar o que foi decidido | Corrigido / Decisão técnica (com motivo, vai no parecer) / Falso positivo | **Bom** |
| 8. Emitir o parecer | "Parecer em PDF" | **Parcial**: sem texto para colar no e-mail, sem planilha (S6) |
| 9. Voltar quando a revisão B chegar | Soltar a revisão na mesma conversa: comparação com a anterior, "só os capítulos alterados vão ser relidos" | **Excelente**, mas pouco visível |

## Arquitetura de informação do resultado

Cinco leituras do mesmo parecer, observadas na execução (f2/09–13):

| Leitura | Como se chega | Conteúdo | Sobreposição |
|---|---|---|---|
| **Resumo** | ícone 1 / tecla 1 / abre por padrão | Por disciplina, Onde estão, O que foi lido, Falta tratar | — |
| **Resumo completo** ("geral") | **só** clicando no anel; não tem tecla nem rótulo | Veredito, linha do tempo, páginas, achados por nível | Repete "por nível" e "páginas" do Resumo; **é a única com o veredito escrito** |
| **Achados** | ícone 2 / "Abrir a fila" | Fila + detalhe | — |
| **Relatório** | ícone 3 | Texto do parecer | Parecido com o PDF |
| **No documento** | ícone 4 / "No documento" no Resumo | Miniaturas com pinos | Sobrepõe "Onde estão" do Resumo, que é uma versão em quadradinhos sem leitura (f2/08: três quadrados cinza) |

**Problemas de AI (arquitetura de informação):**

### S1 — Duas leituras chamadas "Resumo", e a importante está escondida
- **Evidência:** `trilho.tsx:122-131` (anel → "Resumo completo") e `trilho.tsx:105` ("Resumo"); `resultado.tsx:110-118` (1–4 não alcançam "geral").
- **Impacto:** o profissional procura "veredito e por quê" e cai no Resumo, que não tem o veredito escrito. Duas telas com o mesmo nome é a falha clássica de previsibilidade.
- **Solução:** fundir: o Resumo ganha a faixa do veredito e a linha do tempo recolhida; "Resumo completo" deixa de ser uma leitura separada. "Onde estão" sai do Resumo (o "No documento" já faz isso direito).
- **Aceite:** o trilho tem 4 leituras com nome; nenhuma informação do "geral" se perde (veredito, motivo, linha do tempo, mapa de páginas, contagem por nível).

### S2 — Ícones sem rótulo num trabalho que é de leitura
- **Evidência:** `trilho.tsx` com `compacto` no palco: só ícones, rótulo na `Dica`. f2/08: seis ícones, sem texto.
- **Impacto:** cada visita custa um hover por ícone; o "No documento" e o "Relatório" ficam pouco usados.
- **Solução:** abas com texto no topo do palco (Resumo · Achados 5 · Relatório · No documento), no lugar das abas "Auditoria / Mapa do volume", que numa conversa só de memorial não têm função.
- **Aceite:** a 1280 px, as 4 leituras aparecem com rótulo legível sem hover.

### S3 — O histórico não se deixa escanear
- **Evidência:** f1/07 e f2/11 (lista de botões da barra lateral): conversas de auditoria chamadas "Memorial · sem tarefa", "Nova conversa · Não emitir · 53 de 53 a tratar", grupo "A endereçar · 48 conversas", "Mais 42 conversas"; "Criciuma", "Florianopolis", "Chapeco" **sem acento** ao lado de "Criciúma" com acento (dois grupos da mesma cidade). No Painel, as 5 linhas de "Continuar" são idênticas: "sem obra · HID · volume" (f1/02).
- **Impacto:** retomar "a auditoria da UBS de terça" exige abrir conversa por conversa.
- **Solução:** o título de uma conversa de auditoria é "Auditoria · <obra curta> · rev. A"; a linha mostra o veredito e "x de y tratados". Conversa sem nenhuma ação (só abriu) não entra no histórico. Agrupar cidade normalizada.
- **Aceite:** nenhuma conversa com auditoria concluída aparece como "Memorial", "Nova conversa" ou "sem tarefa"; uma cidade, um grupo.

### S4 — O meio do caminho perde contexto
- **Evidência:** f3/07: "Nova conversa" dentro de `?intencao=auditar` volta à saudação genérica ("montar — ou auditar?"); f3/08: prancha na tarefa de auditar vira oferta de LD.
- **Aceite:** "Nova conversa" aberta a partir de uma tarefa preserva a tarefa; a tarefa só muda quando a pessoa escolhe outra.

### S5 — Atribuir e avisar são duas coisas, em quatro lugares
- **Evidência:** atribuir em `AcoesRapidas` (linha, `pecas.tsx:314`), `BarraDeSelecao` (lote, `:446`), `Atribuidor` (detalhe, `:645`); e-mail em `Notificar` (`:230`), "Atribuir não manda e-mail" (Ajuda).
- **Impacto:** o profissional atribui e acha que o colega foi avisado.
- **Solução:** ao atribuir, uma linha de status: "Com Carla. Avisar por e-mail agora?" com o botão ali mesmo.
- **Aceite:** depois de atribuir, o estado do aviso fica visível no próprio achado ("avisada em 07/10" ou "não avisada").

### S6 — Exportar: a tela tem menos do que a Ajuda promete
- **Evidência:** trilho tem só "Parecer em PDF" (`trilho.tsx:184`); "Copiar achados / Copiar ações / Baixar .md" só existem no `audit-result.tsx` órfão.
- **Impacto:** quem manda o parecer por e-mail ou junta numa planilha precisa abrir o PDF e copiar à mão.
- **Decisão pendente (produto):** reativar "Copiar achados" (texto para e-mail) ou declarar que só o PDF existe. A simplificação recomendada: **um menu "Levar adiante" com PDF + Copiar texto** (o resto saiu de uso sem reclamação registrada).
- **Aceite:** a Ajuda e a tela citam exatamente as mesmas saídas.

### S7 — Interromper e retomar
- **Evidência (positiva):** F5 aos 40 s reconectou e terminou (f2/07–08); "Continuar" no Painel abre o parecer direto (f3/05); a fala "Pode fechar a aba: eu continuo" está na tela.
- **Evidência (negativa):** ao reabrir, o chat fica rolado no topo (ficha), e a fala final "Auditei…" com o veredito e os três achados citados fica fora da vista.
- **Aceite:** ao reabrir uma conversa com auditoria concluída, o chat mostra a fala final da auditoria sem rolagem manual.

### S8 — A 1440 px a fila corta as ações principais
- **Evidência:** f2/11: detalhe do achado cortado à direita, "Decisão te…" e "Falso positivo" fora da vista; o selo "Estru…" cortado. As três colunas (barra 300 px, palco, chat 360 px) não deixam largura para fila + detalhe.
- **Solução:** com a fila aberta, recolher a barra de conversas automaticamente (o botão "Ocultar conversas" já existe), ou empilhar fila e detalhe abaixo de ~1500 px.
- **Aceite:** a 1366×768 e 1440×900, os três botões de encerrar ficam visíveis sem rolagem horizontal.

## Nota do perfil (0–10)

| Métrica | Nota | Por quê |
|---|---|---|
| Clareza de navegação | 5 | Leituras com nome repetido; ícones sem rótulo |
| Consistência | 4 | Mesmo dado com 2–3 nomes; abas do palco mudam de nome entre estados |
| Eficiência operacional | 6 | Fila com teclado é boa; preparação é longa |
| Descoberta | 4 | "Resumo completo", reuso da base, teclas, "No documento" escondidos |
| Recuperação | 7 | Retomada e F5 sólidos |
