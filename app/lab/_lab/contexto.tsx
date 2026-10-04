"use client";

import { MotionConfig } from "motion/react";
import { ProvedorDeEscala } from "@/lib/ds/tempo";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * O estado do /lab que atravessa todas as páginas: as duas chaves de exame
 * (câmera lenta e movimento reduzido) e o registro de aprovações.
 *
 * CÂMERA LENTA multiplica as durações por 4. Existe porque micro-interação de
 * 120 ms é rápida demais para ser julgada — e é justamente a que mais precisa
 * ser julgada. Cada demonstração lê `escala` e aplica nas próprias durações.
 *
 * MOVIMENTO REDUZIDO força o `MotionConfig` a tratar a página como quem pediu
 * menos movimento ao sistema operacional. Toda interação precisa continuar
 * compreensível assim; o lab é onde isso se prova.
 */

export type StatusDeAprovacao = "pendente" | "aprovado" | "mudar";
export interface Aprovacao {
  status: StatusDeAprovacao;
  nota: string;
  em: string;
}

interface Lab {
  lento: boolean;
  setLento: (v: boolean) => void;
  reduzido: boolean;
  setReduzido: (v: boolean) => void;
  /** Fator de tempo: 1 normal, 4 em câmera lenta. */
  escala: number;
  aprovacoes: Record<string, Aprovacao>;
  carregado: boolean;
  gravar: (id: string, status: StatusDeAprovacao, nota: string) => Promise<boolean>;
}

const LabContexto = createContext<Lab | null>(null);

export function useLab() {
  const lab = useContext(LabContexto);
  if (!lab) throw new Error("useLab fora do /lab");
  return lab;
}

export function ProvedorDoLab({ children }: { children: React.ReactNode }) {
  const [lento, setLento] = useState(false);
  const [reduzido, setReduzido] = useState(false);
  const [aprovacoes, setAprovacoes] = useState<Record<string, Aprovacao>>({});
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch("/api/lab/aprovacoes")
      .then((r) => (r.ok ? r.json() : {}))
      .then((dados: Record<string, Aprovacao>) => {
        if (vivo) setAprovacoes(dados);
      })
      .catch(() => {})
      .finally(() => vivo && setCarregado(true));
    return () => {
      vivo = false;
    };
  }, []);

  const gravar = useCallback(async (id: string, status: StatusDeAprovacao, nota: string) => {
    const anterior = aprovacoes[id];
    // Otimista: o selo troca na hora; se o servidor recusar, volta e avisa.
    setAprovacoes((a) => ({ ...a, [id]: { status, nota, em: new Date().toISOString() } }));
    try {
      const r = await fetch("/api/lab/aprovacoes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status, nota }),
      });
      if (!r.ok) throw new Error(String(r.status));
      return true;
    } catch {
      setAprovacoes((a) => {
        const b = { ...a };
        if (anterior) b[id] = anterior;
        else delete b[id];
        return b;
      });
      return false;
    }
  }, [aprovacoes]);

  const valor = useMemo<Lab>(
    () => ({ lento, setLento, reduzido, setReduzido, escala: lento ? 4 : 1, aprovacoes, carregado, gravar }),
    [lento, reduzido, aprovacoes, carregado, gravar],
  );

  return (
    <LabContexto.Provider value={valor}>
      <ProvedorDeEscala value={lento ? 4 : 1}>
        <MotionConfig reducedMotion={reduzido ? "always" : "user"}>{children}</MotionConfig>
      </ProvedorDeEscala>
    </LabContexto.Provider>
  );
}
