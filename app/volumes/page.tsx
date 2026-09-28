import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { auth } from "@/auth";
import { FundoDoAmbiente } from "@/components/ambiente/fundo-do-ambiente";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getUserAccess } from "@/lib/access-control";
import { buildCallbackPath, redirectToLogin } from "@/lib/auth-redirect";
import { linkDoNexo } from "@/lib/contexto-da-url";
import { getProjectContextForUser } from "@/lib/project-context";
import { VolumeBuilderPage } from "@/modules/volume-builder/components/volume-builder-page";

export default async function VolumesPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();

  if (!session?.user) {
    redirectToLogin(buildCallbackPath("/volumes", params));
  }

  const access = await getUserAccess(session.user.email, session.user.name);

  if (!access.isActive) {
    redirect("/sem-acesso");
  }

  /*
   * O PROJETO SÓ VALE CONFERIDO. `?project=` inacessível caía em "modo
   * independente" na faixa, mas o id cru seguia até a exportação — que então
   * tentava gravar num projeto alheio. Agora só o contexto validado entra.
   * A faixa de projeto virou o seletor da própria mesa (V10), que também
   * vincula sem sair da montagem.
   */
  const projectContext = await getProjectContextForUser(params.project, session.user);

  return (
    <div className="w-full max-w-full space-y-4 overflow-x-clip px-4 py-4 sm:px-6 lg:px-8">
      {/* Atmosfera: sem orbe vivo nesta tela. Ver `campo-neural.tsx`. */}
      <FundoDoAmbiente />
      <PageHeader
        navegacao={{ ehAdmin: access.isAdmin }}
        title="Montar volumes com PDFs existentes"
        description="Importe capas, LDs, pranchas e anexos já prontos, monte os volumes na ordem certa, confira e exporte PDF ou ZIP. Para gerar LD, capa e separatrizes a partir das pranchas, use o Nexo."
      >
        <Button asChild variant="outline" size="sm">
          <Link href={linkDoNexo({ projeto: projectContext?.id ?? null, intencao: "montar" })}>
            <Sparkles className="size-4" aria-hidden />
            Gerar a partir das pranchas
          </Link>
        </Button>
      </PageHeader>

      <VolumeBuilderPage email={session.user.email ?? ""} projectContext={projectContext} />
    </div>
  );
}
