# 06 — Auditoria do design system

**Base:**

- **Tokens:** `app/ds.css`, com prefixo `--ds-*`.
- **Componentes:**
  - `components/ds/basicos.tsx`: Botao, Orbe, Girando, Tecla…
  - `components/ds/micro.tsx`: BotaoDeSegurar, Trelica, Cronometro, Dica, GrupoDeBotoes, SinoDeAviso.
  - `components/ds/graficos.tsx` e `medidas.tsx`.
- **Telas:** os 30 CSS das telas aprovadas.

## Medições

| Medida | Valor |
|---|---|
| Usos de `var(--ds-*)` | 1.752 |
| Hex literal | 64 (41 distintos) |
| `rgb()`/`rgba()` literal | 189 |
| `font-size` distintos | 46 (40 fora do token) |
| `border-radius` distintos | 28 (22 fora do token) |
| Espaçamentos px fora de 4/8 | 663 |
| Níveis de `z-index` | 15 (até 1000) |
| Duração escrita à mão | `0.2s` ×41, `0.25s` ×17 |

**Onde concentra:**

- Hex: `visor.css` (14), `mapa/cartoes.css` (12), `ds/medidas.css` (12), `auditoria.css` (6).
- O bloco `#4e52d8` está quase todo no Painel arquivado.

## Problemas

| ID | Sev. | Resumo |
|---|---|---|
| UI-002 | P1 | O DESIGN.md ("a lei") descreve teal e chanfro; o `ds` não está especificado em lugar nenhum fora do código |
| UI-003 | P2 | Centenas de valores soltos; a escala de tipo, raio, espaço, camada e duração não é token |
| UI-006 | P3 | A grade de lista mora em `mapa.css` e é reusada por Projetos e Projeto; 17 versões arquivadas na árvore das telas |
| UI-004 | P3 | Título de página sem token (5 estilos) |
| QA-004 | P2 | Cabeçalho do palco do Nexo existe em duas versões que divergem em comportamento |

## Consistência de componentes

| Peça | Variações vistas | Comentário |
|---|---|---|
| Botão | primary (pílula clara), ghost, quiet, grupo com tecla, segurar | Coerente. Primary com 34 px e com 38/28 px no admin. |
| Abas | sublinhadas (Projetos, Achados, Ajuda), deslizantes (Resultado), segmentadas (Admin, Topo do palco) | Três formas para "trocar de vista". Defensável por densidade, mas sem regra escrita. |
| Filtro em pílula | Todos / Meus / Sem dono… (fila), Todos / Impedem / Decisão (Achados) | Coerente. |
| Rodapé de teclas | Projetos, Projeto, Achados, Mapa | Coerente. |
| Busca | Topo (Ctrl K), `/` local por painel, barra do Painel | Três buscas com escopos diferentes, todas rotuladas. Ok. |
| Confirmação destrutiva | 3 pesos (Peças) | Coerente e documentado. |

## O que falta para o sistema ser migrável

1. Especificação escrita: o DESIGN.md novo.
2. Escala de tipo e de espaço em token.
3. Grade e Painel como componentes `ds`, não classes `mp-*`.
4. Um cabeçalho de palco do Nexo.
