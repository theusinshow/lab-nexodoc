# Holofote do tour — desenho (09/10/2026)

Frente 3 do refino de tutoriais. A frente 1 (dicas de montar volume) tem spec próprio.

## Problema

O tour (`TourDoNexo`) destaca o alvo com um anel e deixa o resto da tela igual:
o olho não sabe para onde ir. O tour do resultado tem 28 passos seguidos, sem
como pular uma parte, e quem sai perde o lugar.

## Decisão

1. **Holofote.** Uma película só, no `body`, com `clip-path: polygon(evenodd, …)`
   — a janela inteira menos um recorte em chanfro (8px, cantos superior esquerdo e
   inferior direito) do tamanho do alvo + 6px de respiro. Fora do recorte:
   `backdrop-filter: blur(6px)` + escurecimento. Dentro: nítido e clicável.
   Uma camada só, nunca filtro por elemento (o "piscar" do canvas de 12/08 foi
   apagar elemento por elemento).
2. **Animação.** O polígono tem sempre 13 pontos, então a transição de
   `clip-path` interpola de um alvo ao outro (`--duration-slow`,
   `--ease-entrance`). Passo que troca de vista (`clicarAntes`) fecha o recorte
   num ponto (tela toda desfocada) e reabre no alvo novo. O balão some na troca e
   reaparece no lugar novo depois que o recorte chega.
   `prefers-reduced-motion`: troca seca. `prefers-reduced-transparency`: sem
   desfoque, só escurece.
3. **Não prende.** Clique na área desfocada encerra o tour, como Esc. O passo
   em que a pessoa saiu fica guardado no navegador (por roteiro); o botão do
   trilho passa a dizer "Continuar de onde parei" e retoma ali, refazendo o
   clique de vista que o passo pressupõe. Terminar o tour apaga a retomada.
4. **Capítulos.** `PassoDoTour.capitulo` marca o primeiro passo de cada parte;
   os seguintes herdam. O resultado fica em 4: Resumo, Trilho, Achados, Outras
   leituras. O balão mostra "Achados · 3 de 13", uma barra por capítulo e
   "Pular capítulo". Roteiro sem capítulo (tour do Nexo) mostra "3 de 9".
5. **Balão.** Chanfro (`nx-edge-8`), fundo `--card`, sem raio. Vidro sobre
   fundo já desfocado não acrescenta nada, por isso fica chapado.

## Exceção registrada

DESIGN.md §4 restringe `backdrop-filter` ao vidro do chrome e ao backdrop de
modal. A película do tour é um backdrop (ela recebe o clique e encerra), então
entra na segunda categoria. Anotado no §4.

## Prova

- `scripts/test-nexo-tour.ts`: o recorte tem sempre 13 pontos; sem alvo, fecha
  num ponto; nunca sai da janela; capítulos herdam e "pular" cai no início do
  seguinte; todo roteiro com capítulo começa com um.
- No navegador: em cada passo, o centro do alvo é o elemento sob o ponto
  (`elementFromPoint`) e fora dele é a película; clique fora encerra; o botão
  vira "Continuar de onde parei" e reabre no mesmo passo.
