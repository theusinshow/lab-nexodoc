"use client";

/**
 * O AVATAR DE ALGUÉM DO ESCRITÓRIO, na cor da equipe dele.
 *
 * Quem desenha um avatar costuma ter só o e-mail e o nome do responsável; o
 * grupo e o papel moram em `/api/organizacao/membros`. A lista é buscada UMA
 * vez por carga e dividida por todos os avatares da tela — guardar a promessa
 * em módulo evita uma viagem por linha da fila.
 *
 * Sem a lista (falha de rede, pessoa que saiu do escritório), o avatar sai
 * cinza, como sempre foi: a cor é um atalho, nunca a única informação.
 */
import { useEffect, useState } from "react";

import { Avatar } from "@/components/ds/basicos";
import { corDaPessoa } from "@/lib/cor-da-pessoa";

type Membro = { email: string; grupo: string | null; role: string };

let emVoo: Promise<Map<string, Membro>> | null = null;

function buscarMembros(): Promise<Map<string, Membro>> {
  if (!emVoo) {
    emVoo = fetch("/api/organizacao/membros")
      .then((r) => (r.ok ? r.json() : { membros: [] }))
      .then((d: { membros?: Membro[] }) => new Map((d.membros ?? []).map((m) => [m.email.toLowerCase(), m])))
      .catch(() => {
        // A falha não fica grudada: a próxima montagem tenta de novo.
        emVoo = null;
        return new Map<string, Membro>();
      });
  }
  return emVoo;
}

export function AvatarDaPessoa({ email, iniciais, pequeno }: { email: string | null | undefined; iniciais: string; pequeno?: boolean }) {
  const [membro, setMembro] = useState<Membro | null>(null);
  const chave = (email ?? "").trim().toLowerCase();

  useEffect(() => {
    if (!chave) return;
    let vivo = true;
    buscarMembros().then((m) => {
      if (vivo) setMembro(m.get(chave) ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [chave]);

  return <Avatar iniciais={iniciais} pequeno={pequeno} cor={corDaPessoa(membro)} />;
}
