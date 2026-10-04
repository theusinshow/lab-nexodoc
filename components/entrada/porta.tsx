import type { ReactNode } from "react";

import { Orbe } from "@/components/ds/basicos";
import { FONTES_DS } from "@/lib/ds/fontes";
import { VERSAO_DO_BUILD } from "@/lib/versao-do-build";

import { Filme } from "./filme";
import { FundoDaPorta } from "./fundo";
import "@/app/ds.css";
import "./entrada.css";

/*
 * A PORTA DE ENTRADA, a casca do login e do "sem acesso" (desenho aprovado no
 * laboratório, /lab/telas/entrada). À esquerda a porta; à direita o filme do
 * Nexo: a auditoria do memorial, o volume e o orbe, em loop mudo.
 *
 * É a primeira tela do sistema novo (ds) no app: `.ds` e a Geist valem só daqui
 * para dentro, e nada do resto do app muda.
 */
export function PortaDeEntrada({
  children,
  depois,
}: {
  children: ReactNode;
  depois?: ReactNode;
}) {
  return (
    // `.ds` em volta e `.en` dentro: os estilos do sistema novo são escritos como `.ds .x`.
    <div className={`ds ${FONTES_DS}`}>
      <div className="en">
        <section className="en-porta">
          <FundoDaPorta />
          <header className="en-marca">
            <Orbe tamanho={18} />
            <span>Nexo</span>
          </header>
          <main className="en-conteudo">
            <div className="en-cartao">{children}</div>
          </main>
          {depois}
          <footer className="en-pe">
            <span>PROSUL</span>
            <span className="en-mono">versão {VERSAO_DO_BUILD}</span>
          </footer>
        </section>
        <section className="en-filme" aria-hidden>
          <Filme />
        </section>
      </div>
    </div>
  );
}
