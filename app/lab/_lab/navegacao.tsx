"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { MOLA, escalarMola } from "@/lib/ds/movimento";

import { useLab } from "./contexto";

/** As fases do redesenho, na ordem em que se aprovam. As futuras aparecem
 *  desligadas: o lab mostra o caminho inteiro desde o primeiro dia. */
const FASES: { href: string; rotulo: string; fase: string; pronta: boolean }[] = [
  { href: "/lab", rotulo: "Visão geral", fase: "", pronta: true },
  { href: "/lab/inventario", rotulo: "Inventário", fase: "0", pronta: true },
  { href: "/lab/fundamentos", rotulo: "Fundamentos", fase: "1", pronta: true },
  { href: "/lab/componentes", rotulo: "Componentes", fase: "2", pronta: false },
  { href: "/lab/micro", rotulo: "Micro-interações", fase: "3", pronta: false },
  { href: "/lab/telas", rotulo: "Telas", fase: "4", pronta: false },
  { href: "/lab/fluxos", rotulo: "Fluxos", fase: "4", pronta: false },
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
        if (!f.pronta) {
          return (
            <span key={f.href} className="lab-link" aria-disabled="true">
              {f.rotulo}
              <span className="lab-fase">fase {f.fase}</span>
            </span>
          );
        }
        return (
          <Link key={f.href} href={f.href} aria-current={ativo ? "page" : undefined}>
            {ativo && (
              <motion.span
                layoutId="lab-nav-fundo"
                className="lab-link-fundo"
                transition={escalarMola(MOLA.smooth, escala)}
              />
            )}
            <span>{f.rotulo}</span>
            {f.fase && <span className="lab-fase" style={{ marginLeft: "auto", fontSize: 11, color: "var(--ds-text-tertiary)" }}>fase {f.fase}</span>}
          </Link>
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
