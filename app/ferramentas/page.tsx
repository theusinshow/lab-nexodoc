import { redirect } from "next/navigation";

/**
 * FERRAMENTAS ANTIGAS — agora um redirecionamento (auditoria UX/UI, G01).
 *
 * A página listava uma única tela, a montagem manual de volumes, com selo de
 * "ferramenta antiga". Ela não é legado: monta o projeto inteiro a partir de
 * PDFs prontos, o que o Nexo não faz. Virou "Montar volumes" na navegação
 * principal; o endereço antigo continua funcionando e leva para lá.
 */
export default function FerramentasAntigasPage() {
  redirect("/volumes");
}
