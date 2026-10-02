"use client";

/**
 * A ZONA DE SOLTA da entrada — a segunda metade de uma regra que estava pela
 * metade.
 *
 * A DESIGN.md §8 diz do composer: "Zona de solta VISÍVEL e overlay de tela
 * cheia no arrastar". O overlay existia; a zona visível, não. O resultado era
 * uma tela que dizia "Solte as pranchas e eu leio os selos" e não oferecia onde
 * soltar: a única afordância era um clipe de 12px no rodapé. Medido: ~40% da
 * altura da entrada era vazio, entre o subtítulo e o campo de texto.
 *
 * Ela ocupa o espaço que o shell JÁ reservava para o log da conversa na entrada,
 * então não desloca nada quando a conversa começa — a caixa vira o chat.
 *
 * Estrutura conforme §7 (estados vazios): um Mono Label nomeando a região, uma
 * linha de Body dizendo o que vai aparecer e como fazer aparecer, e UMA ação
 * primária. Sem ilustração grande, sem emoji, sem tom de marketing — o estado
 * vazio ensina a interface, não a anuncia.
 */

import { FileUp } from "lucide-react";

import { Botao } from "@/components/ds/basicos";

export function ZonaDeSolta({
  onAnexar,
  /** O arrasto já está acontecendo: o overlay de tela cheia assume, e esta
   *  zona sai do caminho em vez de competir com ele por atenção. */
  arrastando = false,
}: {
  onAnexar?: () => void;
  arrastando?: boolean;
}) {
  return (
    <div className={`nx-zona${arrastando ? " nx-zona--arrastando" : ""}`}>
      <FileUp size={18} strokeWidth={1.5} aria-hidden />
      {/*
        As DUAS portas nomeadas, com o que cada uma produz: quem chega com um
        memorial precisa saber que a auditoria mora aqui, e quem chega com
        pranchas, que não vai preencher formulário.
      */}
      <p className="nx-zona-titulo">Solte os arquivos aqui</p>
      <p className="nx-zona-texto">Pranchas em PDF viram LD, capa, separatriz e volume. O memorial vira auditoria contra a obra declarada.</p>
      <Botao variante="ghost" tamanho="sm" onClick={onAnexar}>
        Anexar arquivos
      </Botao>
    </div>
  );
}
