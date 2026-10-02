"use client";

/**
 * O CAMPO DE ESCREVER AO NEXO (desenho do lab: `Campo` da Conversa v2). Uma
 * caixa só: o texto em cima, e no pé anexar, o que mais vier (`trailing`) e
 * enviar. Enviar ganha peso quando há o que mandar; respondendo, vira Parar.
 *
 * `data-tour="composer"` é âncora do tour e das jornadas da bateria; os
 * rótulos "Anexar PDFs", "Enviar" e "Parar" também são lidos por elas.
 */

import type { ReactNode, RefObject } from "react";
import { ArrowUp, Paperclip, Square } from "lucide-react";

import "@/components/telas/nexo/conversa.css";

export function NexoComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  variant,
  onAttach,
  inputRef,
  trailing,
  motivoDesabilitado,
  onFoco,
}: {
  value: string;
  onChange: (v: string) => void;
  onFoco?: (focado: boolean) => void;
  onSubmit: () => void;
  onStop?: () => void;
  busy: boolean;
  variant: "hero" | "docked";
  onAttach?: () => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  trailing?: ReactNode;
  motivoDesabilitado?: string;
}) {
  const isHero = variant === "hero";
  const pronto = Boolean(value.trim()) && !busy && !motivoDesabilitado;
  return (
    <div className="cx-campo nx-campo" data-tour="composer">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => onFoco?.(true)}
        onBlur={() => onFoco?.(false)}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = `${el.scrollHeight}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!busy) onSubmit();
          }
        }}
        rows={1}
        disabled={Boolean(motivoDesabilitado)}
        aria-label="Mensagem para o Nexo"
        placeholder={motivoDesabilitado ? motivoDesabilitado : isHero ? "Peça em texto: “cria a LD e a capa dessas pranchas”, ou solte os PDFs" : "Escreva para o Nexo…"}
      />
      <div className="cx-campo-pe">
        {onAttach && (
          <button type="button" className="cx-campo-botao" onClick={onAttach} aria-label="Anexar PDFs" title="Anexar PDFs">
            <Paperclip size={16} aria-hidden />
          </button>
        )}
        {trailing}
        <span className="cx-enviar-caixa">
          {busy && onStop ? (
            <button type="button" className="cx-enviar cx-enviar--parar" onClick={onStop} aria-label="Parar">
              <Square size={12} fill="currentColor" aria-hidden />
            </button>
          ) : (
            <button type="button" className="cx-enviar" onClick={onSubmit} disabled={!pronto} aria-label="Enviar">
              <ArrowUp size={16} aria-hidden />
            </button>
          )}
        </span>
      </div>
      {isHero && <p className="nx-campo-dica">Ou arraste os PDFs do projeto para qualquer lugar da tela.</p>}
    </div>
  );
}
