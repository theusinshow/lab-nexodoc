import {
  FolderKanban,
  type LucideIcon,
  Waypoints,
} from "lucide-react";

/**
 * Os módulos do software, em UM lugar só.
 *
 * A home e a página de ferramentas antigas descrevem os mesmos módulos com
 * ênfases diferentes; com duas listas, uma renomeação em cima da outra passaria
 * despercebida — foi assim que a "Conferência documental" continuou anunciada
 * depois de ter virado parte do Nexo.
 */

export type ModuleDef = {
  title: string;
  description: string;
  href: string;
  label: string;
  icon: LucideIcon;
  emphasis: boolean;
  status: "active" | "planned";
  shortcut: string | null;
  beta?: boolean;
};

export const nexoModule: ModuleDef = {
  title: "Nexo",
  description:
    "Solte os PDFs e diga o que precisa: o assistente orquestra LD, capas, volume e auditoria, sempre confirmando cada passo.",
  href: "/nexo",
  label: "Abrir Nexo",
  icon: Waypoints,
  emphasis: true,
  status: "active",
  shortcut: null,
  beta: true,
};

export const projetosModule: ModuleDef = {
  title: "Projetos",
  description:
    "Acompanhe projetos, uploads, documentos, artefatos e eventos consolidados no banco.",
  href: "/projetos",
  label: "Abrir projetos",
  icon: FolderKanban,
  emphasis: true,
  status: "active",
  shortcut: null,
};

/*
 * As telas de módulo único, anteriores ao Nexo, acabaram. A última,
 * `/volumes` (montar volumes com PDFs existentes), saiu em 01/10/2026 por
 * decisão do Matheus: o endereço redireciona para o Nexo, onde o volume nasce
 * das pranchas.
 */
