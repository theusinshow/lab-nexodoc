# Caminho da rede no rodapé da LD

08/10/2026. Desenho aprovado parte a parte com o Matheus.

## O problema

O padrão do escritório imprime, no rodapé de toda LD, o caminho de rede do
próprio `.odt` — os diretores usam isso para abrir o PDF e saber onde o arquivo
mora. O template do Nexo (`templates/modelo_ld_empresa.odt`) não tem essa linha,
então toda LD montada pelo Nexo sai sem ela.

## O que foi medido

As 62 LDs de `docs/samples` (texto extraído com pdfjs, página 1):

- O caminho é sempre o do **`.odt` da própria LD**, nunca o das pranchas. É o
  campo "nome do arquivo" do LibreOffice: mostra onde o arquivo foi salvo.
- Forma: `P:\cad\<cliente>\<projeto>\<pasta da disciplina>\documentos\<emissão>\<nome>.odt`.
- Só a **emissão** é livre, e varia até entre disciplinas do mesmo volume:
  `1_emissão inicial_out-25`, `1_emissão inicial_out-2025`,
  `1_emissao inicial_out.25`, `4_recebido 14_10_25`, ou nenhuma. Pode ter mais
  de um nível (`1_inc\1_emissão inicial_jun-2026`).
- 3 de 62 apontam para a máquina de alguém (`C:\Projetos C3D\…`, `V:\125_23\…`),
  1 é de outro projeto, 1 tem `XX` no nome — o campo automático registra onde
  foi salvo por último, não onde deveria estar.
- As pranchas não trazem caminho (1 de 25, no título do PDF, e mutilado).

## Decisões

1. **Abordagem A**: caminho sugerido, emissão editável por disciplina, colar
   aceito. (B — só colar — não atende quem ainda não criou a pasta; C — padrão
   imposto — exige mudar o costume.)
2. A pasta da emissão **às vezes já existe, às vezes não**: a tela sugere o
   nome e também aceita colar do Explorer.
3. **Sem cadastro novo no admin**: a tabela de disciplinas mora no código; o
   caso fora da regra se resolve colando uma vez e a memória do projeto guarda.
4. **ZIP plano**, como hoje, mas com **uma LD por disciplina** (muda a decisão
   de 30/09 de "só 3 arquivos" — só para volume misto).

## Parte 1 — De onde vem cada pedaço

| pedaço | fonte |
|---|---|
| `P:\cad\` | constante |
| cliente | `templateId` da capa (`pmcriciuma`, `prefchap`, `prefflor`, `prefsjose`); sem modelo, do primeiro caminho colado |
| projeto | código com `_` (`116_25`) |
| pasta da disciplina | tabela abaixo |
| `documentos\` | constante |
| emissão | sugerida; editável no topo (vale para todas) ou por linha |
| nome | `buildOdtFileName` (já existe) |

Tabela de disciplinas (maioria nas 62 LDs; empate decidido pela mais recente):

| sigla | pasta |
|---|---|
| arq, urb, psg, mqt, lev, top | `arquitetonico` |
| snd | `sondagens` |
| gmt, ter, geo | `terraplenagem` |
| dre | `drenagem` |
| pav | `pavimentacao` |
| est | `estrutural_concreto` |
| met | `estrutural_metalico` |
| elt, ele | `eletrico` |
| cab | `cabeamento` |
| cft, cftv | `cftv` |
| his | `hidrossanitario` |
| inc, spd | `preventivo_incendio` |
| cli | `climatizacao` |
| gme | `gases medicinais` |

`top` fica em `arquitetonico` (2 de 3; o 156-25 usa `topografia`) — quem
divergir cola uma vez.

Sigla fora da tabela: a pasta da disciplina fica vazia e a linha pede colagem;
o caminho sai até `<projeto>\` mais o nome, nunca com um segmento inventado.

**Sugestão da emissão**: revisão `a` → `1_emissão inicial_<mmm>-<aa>`;
revisão de letra N (b=2, c=3…) → `<N>_revisão_<mmm>-<aa>`. Mês e ano são os da
capa (`params.mes`/`params.ano`), em minúsculas abreviadas (`out-25`).

**Precedência**: caminho colado > memória do projeto > dedução.

**Memória do projeto**: a escolha vira decisão da conversa (`caminhoDaRede`,
mesmo mecanismo de `semBairro`, sobrevive ao F5). O volume seguinte da mesma
obra (mesma `folderKey` que `/api/nexo/obra` usa) parte da decisão do volume
mais recente — sem tabela nova. Da memória reaproveita cliente e pasta da
disciplina; a emissão volta a ser sugerida se a revisão mudou.

**Colar**: `separarCaminhoColado(texto, siglas)`:
- aceita `\` ou `/`, aspas em volta (o "Copiar como caminho" do Windows põe
  aspas), barra no fim, e nome de arquivo no fim (descartado se terminar em
  `.odt`/`.pdf`/`.dwg`);
- localiza `documentos\`: o que vem antes é raiz+cliente+projeto+disciplina, o
  que vem depois é a emissão;
- sem `documentos\` no colado: usa o caminho inteiro como pasta final (a LD vai
  direto nele, como no `156-25\topografia\`);
- reconhece a disciplina pela pasta (tabela invertida) para saber em que linha
  aplicar quando colado no campo do topo.

## Parte 2 — A tela

Terceira pergunta de `PerguntasAntesDeGerar` (depois de volume e bairro).
**Opcional, nunca trava o Gerar.**

Fechada por padrão, já com a sugestão:

```
✓ Na rede: …\documentos\1_emissão inicial_out-25\  · 3 disciplinas        ✎ mudar
```

Aberta:

```
Onde as LDs ficam na rede?
Cole o endereço do Explorer ou escreva o nome da pasta desta emissão.

Pasta desta emissão  [ 1_emissão inicial_out-25          ]

ELT  …\116_25\eletrico\documentos\  1_emissão inicial_out-25
CAB  …\116_25\cabeamento\documentos\  1_emissão inicial_out-2025   ✎ própria · voltar
CFT  …\116_25\cftv\documentos\  1_emissão inicial_out-25
```

- Parte deduzida em `text-muted-foreground`, cortada pela esquerda (`…\`); a
  emissão em destaque. O palco do Nexo é estreito (ver breakpoint de container).
- Clicar na emissão de uma linha vira campo; ao sair, a linha fica **própria** e
  ganha "voltar" (volta a seguir o topo).
- Colar caminho completo no topo: se a disciplina for reconhecida, aplica só
  àquela linha; senão vale como emissão de todas.
- Colar numa linha: substitui a dedução inteira daquela disciplina.
- Hover/foco mostra o caminho completo (`title` + texto acessível).
- Volume de disciplina única: uma linha só; o campo do topo some (é a mesma coisa).
- Depois de gerar: `PainelDoVolume` mostra os caminhos com "mudar"; mudar
  envelhece a LD daquela disciplina pelo aviso existente de peça regerada
  (`VolumesDesatualizados`).

## Parte 3 — Os arquivos

**PDF (LD por tomo, a que entra no volume)**: linha nova no rodapé do template,
acima de "Direitos Autorais", como nas entregues: `<caminho>   Pág.<n>`. O
caminho entra como **propriedade de usuário** do documento (`meta.xml`, campo
`text:user-defined` no rodapé), igual a título e prefeitura em
`updateDisplayedProperties` — texto estático, não vira a pasta temporária na
conversão. Volume misto: cada bloco de LD com o caminho da sua disciplina.

**ODT editável**: no lugar da propriedade, o campo `text:file-name
text:display="full"` — o costume do escritório; salvo na pasta certa mostra a
pasta certa. Valor em cache = o caminho calculado, para abrir já mostrando-o.

**ZIP**: continua plano. Volume misto passa a levar **uma LD por disciplina**
(`116_25_urb_ld_a.odt`, `116_25_psg_ld_a.odt`…) em vez da consolidada única;
disciplina única não muda. Capa e separatriz não mudam.

**Sem caminho** (nada deduzido, nada colado): a linha do rodapé fica vazia —
nunca um caminho inventado.

## Fora do escopo

- Gravar na pasta (removido a pedido em 30/09; só download).
- ZIP em árvore (exige saber onde capa e separatriz moram — não medido).
- A conferência acusar caminho `C:\`/de outro projeto em LD entregue —
  registrado como ideia, não entra aqui.

## Testes

- Puros (node, `scripts/test-caminho-da-rede.ts`): dedução por sigla, sigla fora
  da tabela, sugestão da emissão por revisão/mês, `separarCaminhoColado` (com e
  sem nome de arquivo, com aspas, `/`, barra no fim, sem `documentos\`,
  emissão com dois níveis, disciplina reconhecida ou não), precedência.
- Gerador: ODT gerado tem a propriedade no `meta.xml` e o campo no rodapé do
  `styles.xml`; editável tem `text:file-name`.
- Navegador: gerar um volume misto e ler o rodapé de cada bloco do PDF com o
  script de pdfjs usado na medição; baixar o ZIP e conferir uma LD por disciplina.
