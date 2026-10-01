---
workflow: general-video
flow: automation
storyboard: no
message: "O Nexo audita o memorial — lê, acha o que trava, dá o parecer — e monta o volume"
destination: website
aspect: 1440x1080
language: pt-BR
audience: engenheiros e projetistas do escritório, na porta de entrada do Nexo
length: 20s
---

## Intent

Motion graphic de ~20 s em loop praticamente imperceptível, no painel direito da tela de
login (esquerda: o login padrão). A AUDITORIA DE MEMORIAL É A PROTAGONISTA (pedido do Matheus,
01/10: "o principal do software é o audit de memorial"); o fechamento mostra as DUAS funções
principais juntas: auditar o memorial e montar o volume. Premium, cinematográfico, sem SaaS
genérico. Matéria-prima: o memorial da 117-25 e os achados reais da tela Resultado aprovada
(ACH-002 48,60 m³ × 46,20 no quadro, ACH-003 1.240 m², ACH-004 NBR 5626:1998, ACH-007 "os quadro"),
a faixa do parecer, a fileira do volume com as setas aprovadas, o orbe, Geist, ds escuro.

## Customizations

- 0–3,4 s: lê a p. 14 em close; a marca acende em "48,60 m³"; o fio cruza com o quadro da p. 31.
- 3,4–7,5 s: recua sobre as páginas; o feixe varre e os achados nascem presos ao trecho.
- 7,5–10,1 s: o parecer (não emitir → revisão B → com ressalvas); o número da p. 14 é corrigido.
- 10,1–13,35 s: a própria p. 14 vira o memorial da fileira e o volume se monta; o cartão final
  diz as duas funções ("Audita o memorial. Monta o volume.") sobre a fileira e o parecer.
- 13,35–17,7 s: O ORBE (pedido do Matheus, 01/10): o orbe do HUD sai do canto, cresce no centro
  com "Nexo" embaixo e respira, sozinho no escuro. PROVISÓRIO: o orbe completo ainda vai ser montado
  (o do produto é GL). ATUALIZADO 01/10: agora é o orbe real (AgentOrbScene, violeta → coral) em
  48 quadros capturados e fechados em laço (assets/orbe-vivo.png), não mais o conic-gradient.
- 17,7–20 s: atrás do orbe, a câmera mergulha de volta na p. 14; o orbe volta ao canto: o último
  quadro é o primeiro.
- SEM FUNDO PONTILHADO (Matheus não gostou): escuro, halo e vinheta. Véus no topo e na base
  para o HUD nunca ficar sobre o papel claro.
- prefers-reduced-motion: pôster parado no quadro das duas funções (13,2 s).

## Notes

- 1440x1080 4:3, zona segura central para o recorte cover do painel em 1440 e 2560.
- Sem áudio: vai num login, mudo.
- Composições: compositions/leitura.html (mundo e câmera) e compositions/legenda.html (HUD e
  tipografia), no mesmo relógio (objeto R nas duas).
