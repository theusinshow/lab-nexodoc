"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

/** O "G" do Google fica colorido: é a única cor de fora na tela (marca de terceiro, sinal de confiança). */
function MarcaDoGoogle() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.63-.06-1.23-.16-1.8H9v3.4h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.58Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.87-3.04.87-2.35 0-4.34-1.58-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.6.1-1.17.28-1.7V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.33Z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.34L15.02 2.34A8.64 8.64 0 0 0 9 0 9 9 0 0 0 .96 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}

/**
 * O único primário da porta. Enquanto o pedido sai para o Google ele diz isso
 * ("Indo para o Google") e trava, para o segundo clique não abrir outra ida.
 */
export function BotaoDoGoogle({ descritoPor }: { descritoPor: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="en-google" disabled={pending} aria-describedby={descritoPor}>
      {pending ? <LoaderCircle size={16} className="en-gira" aria-hidden /> : <MarcaDoGoogle />}
      {pending ? "Indo para o Google" : "Entrar com Google"}
    </button>
  );
}
