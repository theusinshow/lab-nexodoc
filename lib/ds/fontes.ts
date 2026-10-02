import { Geist, Geist_Mono } from "next/font/google";

/*
 * A FONTE DO SISTEMA NOVO (ds). Carrega só onde uma tela já migrou: o resto
 * do app segue no IBM Plex até a migração chegar nele. As variáveis são as que
 * `app/ds.css` lê em `.ds` (`--font-ds-sans`, `--font-ds-mono`).
 */
export const geist = Geist({ subsets: ["latin"], variable: "--font-ds-sans", display: "swap" });
export const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-ds-mono", display: "swap" });

/** Classe para pôr junto de `.ds` na raiz de uma tela migrada. */
export const FONTES_DS = `${geist.variable} ${geistMono.variable}`;
