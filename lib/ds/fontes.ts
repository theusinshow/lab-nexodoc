import localFont from "next/font/local";

/*
 * AS FONTES, servidas do próprio projeto (`./arquivos-de-fonte`, licença OFL).
 *
 * Eram `next/font/google`, e isso põe o Google no caminho do BUILD: o
 * Turbopack baixa os arquivos na hora de compilar. Em 08/10/2026 um deploy na
 * Railway caiu com "next/font/google queries have exactly one entry" — o mesmo
 * código compilava aqui e passou no deploy seguinte. Uma falha de rede alheia
 * não pode derrubar a publicação; com os arquivos no repositório, não derruba.
 *
 * Só o subconjunto latino (o mesmo `subsets: ["latin"]` de antes): cobre o
 * português inteiro. Os arquivos saíram dos pacotes oficiais do npm (`geist`
 * 1.7.2 da Vercel, `@fontsource/ibm-plex-*` 5.3.0).
 */

/*
 * A FONTE DO SISTEMA NOVO (ds). Carrega só onde uma tela já migrou: o resto
 * do app segue no IBM Plex até a migração chegar nele. As variáveis são as que
 * `app/ds.css` lê em `.ds` (`--font-ds-sans`, `--font-ds-mono`).
 */
export const geist = localFont({
  src: "./arquivos-de-fonte/Geist-Variable.woff2",
  weight: "100 900",
  variable: "--font-ds-sans",
  display: "swap",
});

export const geistMono = localFont({
  src: "./arquivos-de-fonte/GeistMono-Variable.woff2",
  weight: "100 900",
  variable: "--font-ds-mono",
  display: "swap",
});

/** Classe para pôr junto de `.ds` na raiz de uma tela migrada. */
export const FONTES_DS = `${geist.variable} ${geistMono.variable}`;

/*
 * IBM Plex Sans/Mono (DESIGN.md seção 3): família única de engenharia, fora do
 * look v0/IA. Pesos conforme a rampa: 400 body, 500 label/title, 600 display.
 * Não é variável, então cada peso é um arquivo.
 */
export const plexSans = localFont({
  src: [
    { path: "./arquivos-de-fonte/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./arquivos-de-fonte/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./arquivos-de-fonte/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
});

export const plexMono = localFont({
  src: [
    { path: "./arquivos-de-fonte/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./arquivos-de-fonte/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});
