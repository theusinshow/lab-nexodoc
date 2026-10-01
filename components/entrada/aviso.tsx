import { Check, CircleAlert, Info } from "lucide-react";
import type { ReactNode } from "react";

export type TomDoAviso = "ok" | "atencao" | "erro" | "info";

/** Aviso da porta: a cor fica no ícone, o texto lê em neutro. Erro é `alert`; o resto, `status`. */
export function Aviso({ tom, children }: { tom: TomDoAviso; children: ReactNode }) {
  const Icone = tom === "ok" ? Check : tom === "info" ? Info : CircleAlert;
  return (
    <p className={`en-aviso en-aviso--${tom}`} role={tom === "erro" ? "alert" : "status"}>
      <Icone size={14} strokeWidth={2} aria-hidden />
      <span>{children}</span>
    </p>
  );
}
