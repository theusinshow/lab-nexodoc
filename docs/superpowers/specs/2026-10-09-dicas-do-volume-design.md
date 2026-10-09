# Dicas e passo a passo do volume (09/10/2026)

Frente 1 do refino de tutoriais. Montar volume perdeu toda a explicação
quando o tour do primeiro acesso saiu, em 07/10. Decidido sem dado de uso
(carta branca do Matheus): ensinar na hora, uma coisa por vez, e nunca travar.

## Dicas de uma vez (`DicaDeUmaVez`, guardadas no navegador)

| id | Onde | Quando |
|---|---|---|
| `volume-plano` | No plano do chat, antes da pergunta do volume | O primeiro plano com capa |
| `volume-canvas` | Embaixo das abas Obra/Volume/Lista | A vista Volume com folhas |
| `volume-entrega` | Dentro da doca | Depois do "Entendi" da dica do mapa (uma dica por vez) |
| `volume-teto` | Dentro da doca, no lugar da de entrega | Um tomo passou de 20 MB |

Texto de duas a três linhas no máximo. Medido: a dica do mapa ocupa 11% do
canvas no palco estreito; com as duas abertas juntas, passavam de 25%.

## Passo a passo (`PASSOS_DO_TOUR_DO_VOLUME`, roteiro "volume")

- **Não abre sozinho.** Montar é uma tarefa em curso. A dica do mapa aponta o
  "?" ao lado das abas.
- Dois capítulos. **O mapa:** abas, fileiras, cabeçalho, peças, Montar, teto,
  conferência. **A entrega:** doca, editáveis, volumes.
- Só clica em "Volume" (teste). Nunca em Montar, Baixar ou Dividir.
- **O canvas se aproxima.** A 0,4 de zoom o cabeçalho do tomo virava um risco
  sob o holofote. O passo com `aproximar` pede ao canvas (evento de janela,
  `aproximar-no-tour.ts`) que enquadre o nó do alvo. O passo seguinte sem
  `aproximar`, ou o fim do tour, devolve o enquadramento que a pessoa tinha.

## Também corrigido

O texto da doca dizia "Monte os tomos pelo botão de cada um no canvas",
enquanto o cartão do chat oferece "Montar os N volumes". Agora a doca cita os
dois caminhos.

## Prova

`scripts/prova-dicas-do-volume.mjs` (build de produção, conversa real, sem
token) confere:
- a dica do mapa aparece e cobre menos de 15% do canvas;
- a dica da entrega espera a do mapa e depois aparece na doca;
- o alvo de cada passo fica nítido;
- o cabeçalho aproximado fica com 300px ou mais;
- clique fora guarda o passo e o "?" vira "Continuar";
- sair devolve o enquadramento.
