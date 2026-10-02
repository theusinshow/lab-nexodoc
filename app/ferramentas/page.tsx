import { redirect } from "next/navigation";

/**
 * `/ferramentas` — ENDEREÇO ANTIGO. Levava a `/volumes`, que saiu em
 * 01/10/2026; agora vai direto ao Nexo, onde montar volume mora.
 */
export default function FerramentasAntigasPage() {
  redirect("/nexo?intencao=montar");
}
