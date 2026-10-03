"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { MOLA, escalarMola } from "@/lib/ds/movimento";

import { useLab } from "./contexto";

/** As fases do redesenho, na ordem em que se aprovam. As futuras aparecem
 *  desligadas: o lab mostra o caminho inteiro desde o primeiro dia. */
const FASES: { href: string; rotulo: string; fase: string; pronta: boolean; grupo?: string }[] = [
  { href: "/lab", rotulo: "Começar aqui", fase: "", pronta: true },
  { href: "/prototipo", rotulo: "Protótipo navegável (app inteiro)", fase: "", pronta: true, grupo: "Juntar tudo" },
  { href: "/lab/telas/historico", rotulo: "Histórico de conversas", fase: "", pronta: true, grupo: "Em andamento" },
  { href: "/lab/telas/nexo-auditoria", rotulo: "Nexo: a auditoria na conversa", fase: "", pronta: true },
  { href: "/lab/telas/orbe", rotulo: "Orbe: violeta → coral", fase: "", pronta: true },
  { href: "/lab/telas/admin", rotulo: "Administração", fase: "", pronta: true, grupo: "Telas para aprovar" },
  { href: "/lab/telas/ajuda", rotulo: "Ajuda", fase: "", pronta: true },
  { href: "/lab/telas/pecas", rotulo: "Peças de toda tela", fase: "", pronta: true },
  { href: "/lab/telas/entrada", rotulo: "Entrada (login e sem acesso)", fase: "", pronta: true },
  { href: "/lab/telas/inicio-d2", rotulo: "Início (D revisto)", fase: "", pronta: true },
  { href: "/lab/telas/conversa", rotulo: "Conversa com o Nexo", fase: "", pronta: true },
  { href: "/lab/telas/nexo", rotulo: "Nexo: montar o volume", fase: "", pronta: true },
  { href: "/lab/telas/mapa", rotulo: "Mapa do volume", fase: "", pronta: true },
  { href: "/lab/telas/mapa-cartoes", rotulo: "Cartão da folha (5 formas)", fase: "", pronta: true },
  { href: "/lab/telas/projetos", rotulo: "Projetos", fase: "", pronta: true },
  { href: "/lab/telas/projeto", rotulo: "Projeto (uma obra)", fase: "", pronta: true },
  { href: "/lab/telas/achados", rotulo: "Achados", fase: "", pronta: true },
  { href: "/lab/telas/auditoria", rotulo: "Auditoria rodando", fase: "", pronta: true },
  { href: "/lab/telas/resultado-e", rotulo: "Resultado da auditoria", fase: "", pronta: true },
  { href: "/lab/telas/parecer", rotulo: "Relatório (aba)", fase: "", pronta: true },
  { href: "/lab/telas/documento", rotulo: "No documento (aba)", fase: "", pronta: true },
  { href: "/lab/telas/conversa-v1", rotulo: "Conversa (primeira versão)", fase: "", pronta: true, grupo: "Arquivadas" },
  { href: "/lab/telas/volumes", rotulo: "Montar volumes manual (fora do redesenho)", fase: "", pronta: true },
  { href: "/lab/telas/resultado-d", rotulo: "Resultado D (enxuta)", fase: "", pronta: true },
  { href: "/lab/telas/resultado-c", rotulo: "Resultado C (lista do que falta)", fase: "", pronta: true },
  { href: "/lab/telas/resultado", rotulo: "Resultado B (painel e níveis)", fase: "", pronta: true },
  { href: "/lab/telas/resultado-v1", rotulo: "Resultado (primeira versão)", fase: "", pronta: true },
  { href: "/lab/telas/auditoria-cheia", rotulo: "Auditoria (versão cheia)", fase: "", pronta: true },
  { href: "/lab/telas/auditoria-v1", rotulo: "Auditoria (primeira versão)", fase: "", pronta: true },
  { href: "/lab/telas/inicio-f", rotulo: "Início F (barra de comando)", fase: "", pronta: true },
  { href: "/lab/telas/inicio-d", rotulo: "Início D (primeira versão)", fase: "", pronta: true },
  { href: "/lab/telas/inicio-e", rotulo: "Início E (a mesa)", fase: "", pronta: true },
  { href: "/lab/telas/painel", rotulo: "Painel A", fase: "", pronta: true },
  { href: "/lab/telas/painel-oficio", rotulo: "Painel: o ofício (grafite)", fase: "", pronta: true },
  { href: "/lab/telas/painel-b", rotulo: "Painel B (mesa de trabalho)", fase: "", pronta: true },
  { href: "/lab/telas/projetos-c", rotulo: "Projetos C (linha de produção)", fase: "", pronta: true },
  { href: "/lab/fundamentos", rotulo: "Fundamentos", fase: "", pronta: true, grupo: "Bastidores" },
  { href: "/lab/inventario", rotulo: "Inventário", fase: "", pronta: true },
];

export function NavegacaoDoLab() {
  const caminho = usePathname();
  const { lento, setLento, reduzido, setReduzido, escala } = useLab();

  return (
    <nav className="lab-nav" aria-label="Laboratório">
      <div className="lab-marca">
        <span className="lab-orbe" aria-hidden />
        <div>
          Laboratório
          <small>Redesenho do Nexo</small>
        </div>
      </div>

      {FASES.map((f) => {
        const ativo = caminho === f.href;
        const grupo = f.grupo ? <p key={`g-${f.grupo}`} className="lab-nav-grupo">{f.grupo}</p> : null;
        if (!f.pronta) {
          return (
            <span key={f.href} style={{ display: "contents" }}>
              {grupo}
              <span className="lab-link" aria-disabled="true">
                {f.rotulo}
                <span className="lab-fase">em breve</span>
              </span>
            </span>
          );
        }
        return (
          <span key={f.href} style={{ display: "contents" }}>
          {grupo}
          <Link href={f.href} aria-current={ativo ? "page" : undefined}>
            {ativo && (
              <motion.span
                layoutId="lab-nav-fundo"
                className="lab-link-fundo"
                transition={escalarMola(MOLA.smooth, escala)}
              />
            )}
            <span>{f.rotulo}</span>
          </Link>
          </span>
        );
      })}

      <div className="lab-nav-rodape">
        <Chave rotulo="Câmera lenta (4x)" ligada={lento} onTroca={setLento} />
        <Chave rotulo="Movimento reduzido" ligada={reduzido} onTroca={setReduzido} />
      </div>
    </nav>
  );
}

function Chave({ rotulo, ligada, onTroca }: { rotulo: string; ligada: boolean; onTroca: (v: boolean) => void }) {
  const { escala } = useLab();
  return (
    <label className="lab-chave">
      {rotulo}
      <button type="button" role="switch" aria-checked={ligada} onClick={() => onTroca(!ligada)}>
        <motion.span
          animate={{ x: ligada ? 12 : 0 }}
          transition={escalarMola(MOLA.snappy, escala)}
        />
      </button>
    </label>
  );
}
