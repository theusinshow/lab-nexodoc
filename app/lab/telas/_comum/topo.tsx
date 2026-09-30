"use client";

import { Bell, ChevronDown, Search } from "lucide-react";

import { Avatar, Botao, Orbe, Tecla } from "@/components/ds/basicos";
import { USUARIO } from "@/lib/design-lab/amostras";

import "../painel/painel.css";

const DESTINOS = ["Painel", "Projetos", "Montar volumes", "Achados", "Ajuda", "Administração"] as const;

/** A barra de cima das páginas (fora do Nexo). Uma só, para as telas não divergirem. */
export function Topo({ atual, trabalhando = false, aviso = true }: { atual: (typeof DESTINOS)[number]; trabalhando?: boolean; aviso?: boolean }) {
  return (
    <header className="pn-topo">
      <div className="pn-marca">
        <Orbe tamanho={22} estado={trabalhando ? "trabalhando" : "repouso"} />
        Nexo
      </div>
      <nav className="pn-nav" aria-label="Principal">
        {DESTINOS.map((n) => (
          <a key={n} aria-current={n === atual ? "page" : undefined}>
            {n}
          </a>
        ))}
      </nav>
      <button type="button" className="pn-busca">
        <Search size={15} />
        Buscar obra, código ou ação
        <Tecla>Ctrl K</Tecla>
      </button>
      <Botao variante="quiet" icone aria-label="Avisos" className="pn-sino">
        <Bell />
        {aviso && <i />}
      </Botao>
      <button type="button" className="pn-quem">
        <Avatar iniciais={USUARIO.iniciais} />
        <span>
          {USUARIO.nome}
          <small>
            {USUARIO.escritorio}, {USUARIO.papel}
          </small>
        </span>
        <ChevronDown size={14} />
      </button>
    </header>
  );
}
