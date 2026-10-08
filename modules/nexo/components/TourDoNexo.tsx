"use client";

/**
 * O TOUR GUIADO: balão ancorado + anel no alvo, caminhando por um projeto de
 * exemplo real.
 *
 * Não é modal (DESIGN.md §11 manda esgotar o inline antes): a tela não é
 * escurecida nem bloqueada — o anel destaca o alvo, o balão explica ao lado, e
 * o app continua ali, vivo, atrás. Quem quiser sair sai com Esc.
 *
 * O tour DIRIGE a tela clicando nos mesmos controles que o usuário clicaria
 * (`clicarAntes`), em vez de mexer no estado por dentro: o que ele mostra é o
 * comportamento de verdade, e não uma encenação que pode divergir do produto.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { posicaoDoBalao, type Retangulo } from "../lib/posicao-do-balao";
import { PASSOS_DO_TOUR, type PassoDoTour } from "../lib/passos-do-tour";

const LARGURA_BALAO = 340;
/** Quadros (~1 s) esperando um alvo nascer antes de o balão desistir dele e ir para o centro. */
const QUADROS_DE_ESPERA = 60;
/** Quanto um passo com `soSeExistir` espera o que explica entrar na tela antes de ser pulado. */
const ESPERA_DO_ALVO_MS = 2500;

export function TourDoNexo({
  aoSair,
  passos = PASSOS_DO_TOUR,
  rotulo = "Passo a passo do Nexo",
  rotuloFinal = "Começar",
}: {
  aoSair: () => void;
  /** O roteiro; o padrão é o do primeiro contato. O resultado da auditoria tem o dele. */
  passos?: PassoDoTour[];
  rotulo?: string;
  /** O botão do último passo. */
  rotuloFinal?: string;
}) {
  const [indice, setIndice] = useState(0);
  /** O sentido do último passo dado: um passo pulado (`soSeExistir`) segue no mesmo sentido. */
  const sentido = useRef<1 | -1>(1);
  /** O passo cuja tela já está pronta: até lá o balão não aparece (um passo que vai ser pulado não pisca). */
  const [pronto, setPronto] = useState<number | null>(null);
  const [alvo, setAlvo] = useState<Retangulo | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const balaoRef = useRef<HTMLDivElement | null>(null);

  const passo = passos[indice];
  const ultimo = indice === passos.length - 1;

  // Pela ref: quem chama pode passar uma função nova a cada render, e o clique do passo não pode repetir por isso.
  const aoSairRef = useRef(aoSair);
  useEffect(() => {
    aoSairRef.current = aoSair;
  });
  const sair = useCallback(() => {
    aoSairRef.current();
  }, []);

  // O clique que leva a tela ao estado do passo. Roda ANTES de medir: medir um
  // alvo que só nasce depois do clique devolveria zero.
  useEffect(() => {
    let vivo = true;
    let espera = 0;
    const comecar = () => {
      setPronto(indice);
      if (!passo.clicarAntes) return;
      const controle = document.querySelector<HTMLElement>(passo.clicarAntes);
      controle?.click();
    };
    if (!passo.soSeExistir) {
      comecar();
      return;
    }
    /*
     * O que o passo explica pode ainda estar ENTRANDO (a fila desliza depois
     * que a leitura anterior sai): espera um pouco antes de concluir que não
     * existe. Só então pula — sem PDF, sem texto corrigido, explicar o
     * invisível é pior que pular. Por relógio, não por quadro: a animação
     * que se espera é ela mesma feita de quadros.
     */
    const inicio = Date.now();
    const procurar = () => {
      if (!vivo) return;
      if (document.querySelector(passo.soSeExistir!)) return comecar();
      if (Date.now() - inicio < ESPERA_DO_ALVO_MS) {
        espera = window.setTimeout(procurar, 60);
        return;
      }
      const proximo = indice + sentido.current;
      if (proximo >= 0 && proximo < passos.length) setIndice(proximo);
      else sair();
    };
    procurar();
    return () => {
      vivo = false;
      window.clearTimeout(espera);
    };
  }, [passo, indice, passos.length, sair]);

  // O que só aparece no hover (as ações da linha) fica à vista enquanto o passo fala dele.
  useEffect(() => {
    if (!passo.revelar) return;
    const el = document.querySelector<HTMLElement>(passo.revelar);
    el?.setAttribute("data-tour-revelado", "");
    return () => el?.removeAttribute("data-tour-revelado");
  }, [passo]);

  /*
   * A medição do alvo. `useLayoutEffect` porque o balão precisa nascer no lugar
   * certo — medir depois da pintura faria o balão aparecer num canto e pular
   * para o outro, que é o tipo de movimento sem significado que a DESIGN.md
   * proíbe.
   */
  useLayoutEffect(() => {
    let vivo = true;
    let quadro = 0;
    let tentativas = 0;
    let rolou = false;

    // Só mede o passo cuja tela já está pronta (o clique dele feito, o alvo dele na tela).
    if (pronto !== indice) return;

    const medir = () => {
      if (!vivo) return;
      if (!passo.alvo) {
        setAlvo(null);
        setPos(null);
        return;
      }
      const el = document.querySelector(passo.alvo);
      if (!el) {
        // O alvo pode ainda não ter sido montado (a vista acabou de trocar).
        // Insistir por alguns quadros é mais honesto que pular o passo; mas
        // não para sempre, ou o balão nunca aparece.
        if (++tentativas < QUADROS_DE_ESPERA) quadro = requestAnimationFrame(medir);
        else {
          setAlvo(null);
          setPos(null);
        }
        return;
      }
      if (!rolou) {
        // Alvo abaixo da dobra (o rodapé da fila numa janela baixa): traz para a vista e mede no quadro seguinte.
        rolou = true;
        el.scrollIntoView({ block: "nearest" });
        quadro = requestAnimationFrame(medir);
        return;
      }
      const r = el.getBoundingClientRect();
      const retangulo = { x: r.left, y: r.top, largura: r.width, altura: r.height };
      setAlvo(retangulo);
      const alturaBalao = balaoRef.current?.offsetHeight ?? 180;
      setPos(
        posicaoDoBalao(
          retangulo,
          { largura: LARGURA_BALAO, altura: alturaBalao },
          { largura: window.innerWidth, altura: window.innerHeight },
          passo.lado ?? "abaixo",
        ),
      );
    };

    // Um quadro de espera: o clique do passo anterior pode ter trocado a vista.
    quadro = requestAnimationFrame(medir);
    window.addEventListener("resize", medir);
    return () => {
      vivo = false;
      cancelAnimationFrame(quadro);
      window.removeEventListener("resize", medir);
    };
  }, [passo, pronto, indice]);

  const avancar = useCallback(() => {
    sentido.current = 1;
    if (ultimo) sair();
    else setIndice((i) => i + 1);
  }, [ultimo, sair]);

  const voltar = useCallback(() => {
    sentido.current = -1;
    setIndice((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") sair();
      else if (e.key === "ArrowRight" || e.key === "Enter") avancar();
      else if (e.key === "ArrowLeft") voltar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [avancar, voltar, sair]);

  const estiloDoBalao = pos
    ? { left: pos.x, top: pos.y }
    : {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };

  /*
   * NO BODY, por portal: dentro do `.ds` (o resultado da auditoria) o `zoom`
   * de 1.125 multiplicaria `left`/`top`, e o balão andaria 12,5% longe do alvo
   * medido pela janela.
   */
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      {/*
        O anel do alvo. `pointer-events-none` para não roubar o clique do que
        está embaixo: durante o tour a aplicação continua utilizável.
      */}
      {alvo && pronto === indice && (
        <div
          aria-hidden
          data-tour-anel
          className="pointer-events-none fixed z-[60] rounded-md border border-[var(--ring)] transition-[top,left,width,height] duration-200 ease-out motion-reduce:transition-none"
          style={{
            left: alvo.x - 4,
            top: alvo.y - 4,
            width: alvo.largura + 8,
            height: alvo.altura + 8,
            boxShadow: "0 0 0 4px color-mix(in oklab, var(--ring) 25%, transparent)",
          }}
        />
      )}

      <div
        ref={balaoRef}
        role="dialog"
        aria-label={rotulo}
        data-tour-balao
        className={cn(
          "fixed z-[61] flex flex-col gap-2 rounded-md border border-border bg-card p-4",
          "shadow-[var(--shadow-overlay)] transition-[top,left] duration-200 ease-out motion-reduce:transition-none",
        )}
        style={{ width: LARGURA_BALAO, ...estiloDoBalao, visibility: pronto === indice ? undefined : "hidden" }}
      >
        <p className="font-mono text-xs font-medium uppercase tabular-nums tracking-[0.05em] text-muted-foreground">
          {indice + 1} de {passos.length}
        </p>
        <h2 className="text-base font-medium leading-tight">{passo.titulo}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{passo.corpo}</p>

        <div className="mt-1 flex items-center gap-2">
          <Button size="sm" onClick={avancar} data-tour-proximo>
            {ultimo ? rotuloFinal : "Próximo"}
          </Button>
          {indice > 0 && !ultimo && (
            <Button size="sm" variant="ghost" onClick={voltar}>
              Voltar
            </Button>
          )}
          {!ultimo && (
            <Button size="sm" variant="ghost" className="ml-auto" onClick={sair}>
              Pular
            </Button>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
