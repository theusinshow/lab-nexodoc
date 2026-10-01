import { Mail } from "lucide-react";

import { Aviso } from "@/components/entrada/aviso";
import { PortaDeEntrada } from "@/components/entrada/porta";

import { TrocarDeConta } from "./trocar-de-conta";

/*
 * SEM ACESSO, na mesma porta do login (aprovada em /lab/telas/entrada): quem
 * chega aqui foi empurrado por um redirect e precisa saber três coisas — que a
 * conta está certa, quem libera, e que depois é só entrar de novo.
 *
 * Cada responsável vira um pedido já endereçado (mailto com o assunto), não um
 * texto para copiar à mão.
 */
export function AvisoSemAcesso({ email, admins }: { email: string; admins: string[] }) {
  const assunto = encodeURIComponent("Liberação de acesso ao Nexo");

  return (
    <PortaDeEntrada>
      <h1 className="en-titulo">Sua conta está certa, falta a liberação</h1>
      <p className="en-lede">
        Você entrou como <span className="en-mono en-email">{email}</span>. A conta é válida; ela só ainda não foi habilitada para o Nexo.
      </p>

      {admins.length > 0 ? (
        <div className="en-quem">
          <p className="en-quem-titulo">Quem libera no escritório</p>
          <ul>
            {admins.map((admin) => (
              <li key={admin}>
                <span className="en-mono">{admin}</span>
                <a className="ds-btn ds-btn--ghost ds-btn--sm" href={`mailto:${admin}?subject=${assunto}`}>
                  <Mail size={14} strokeWidth={1.75} aria-hidden />
                  Pedir liberação
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Aviso tom="info">Este ambiente não diz quem administra o Nexo. Peça a liberação a quem cuida dos acessos no escritório.</Aviso>
      )}

      <div className="en-rodape en-rodape--linha">
        <p>Depois de liberada, é a mesma conta: entre de novo por aqui.</p>
        <TrocarDeConta />
      </div>
    </PortaDeEntrada>
  );
}
