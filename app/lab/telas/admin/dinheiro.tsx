"use client";

import { Info } from "lucide-react";
import { useState } from "react";

import { Botao } from "@/components/ds/basicos";

import {
  brl,
  COTACAO,
  DIAS,
  FLUXOS,
  GASTO_DO_MES_USD,
  INTERNO,
  ITENS_DE_CUSTO,
  MODELOS,
  num,
  OBRAS,
  ORIGEM_DA_OBRA,
  procedencia,
  ROTULO_DA_ORIGEM,
  TAREFAS,
  TETOS,
  TOTAIS_DO_PERIODO,
  usd,
  type Controle,
} from "./dados-dinheiro";

/*
 * DINHEIRO: quanto custou, contra que teto, e por obra. A ordem é a do app
 * (teto e cotação abrem a tela, depois a fatura, depois o consumo interno),
 * e a régua é a do Cockpit. O real vem sempre colado no dólar, nunca no lugar
 * dele, com "≈" e a procedência da cotação; sem cotação, só dólar.
 */

export type VarianteDinheiro = "normal" | "sem-cotacao" | "sem-preco";

function Teto({ c }: { c: Controle }) {
  const [valor, setValor] = useState(c.valor === null ? "" : String(c.valor));
  const doSistema = c.chave === "teto.global.usd";
  const fracao = doSistema && c.valor ? Math.min(1, GASTO_DO_MES_USD / c.valor) : null;
  return (
    <div className="din-controle">
      <div className="din-controle-cabeca">
        <p className="din-controle-rotulo">{c.rotulo}</p>
        <b className="ds-num">{c.valor === null ? "sem teto" : usd(c.valor)}</b>
      </div>
      <p className="din-origem">
        <span className={`din-origem-ponto din-origem-ponto--${c.origem}`} aria-hidden />
        {ROTULO_DA_ORIGEM[c.origem]} · <span className="mp-mono">{c.variavel}</span>
      </p>
      {fracao !== null && (
        <div className="din-medidor" title="O gasto do mês que o veredito do trilho já mostra">
          <i style={{ transform: `scaleX(${fracao})` }} />
          <span className="ds-num">
            este mês: {usd(GASTO_DO_MES_USD)} de {usd(c.valor!)}
          </span>
        </div>
      )}
      <p className="din-desc">{c.descricao}</p>
      <form className="din-campo" onSubmit={(e) => e.preventDefault()}>
        <span className="din-prefixo">US$</span>
        <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder={`vazio = não declarado · aceita ${num(c.minimo)} a ${num(c.maximo)}`} aria-label={c.rotulo} />
        <Botao variante="ghost" tamanho="sm" type="submit">
          Salvar
        </Botao>
        {c.origem === "banco" && (
          <Botao variante="quiet" tamanho="sm" title="Apaga a declaração e volta a valer o ambiente (ou o padrão do motor)">
            voltar ao ambiente
          </Botao>
        )}
      </form>
    </div>
  );
}

function Num({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <div className="adm-num adm-num--fixo">
      <span className="adm-num-rotulo">{rotulo}</span>
      <b className="ds-num">{valor}</b>
      <span className="adm-num-detalhe">{detalhe}</span>
    </div>
  );
}

export function Dinheiro({ variante, periodo }: { variante: VarianteDinheiro; periodo: number }) {
  const cot = variante === "sem-cotacao" ? null : COTACAO.valor;
  const [cotacao, setCotacao] = useState(cot === null ? "" : String(cot).replace(".", ","));
  const t = TOTAIS_DO_PERIODO;
  const maxTokens = Math.max(...DIAS.map((d) => d.tokens));
  const semPreco = variante === "sem-preco";
  const piso = semPreco ? "≥ " : "";

  return (
    <>
      <div className="din-topo">
        <section className="adm-bloco din-tetos" aria-labelledby="din-teto">
          <header>
            <h2 id="din-teto">Teto de gasto</h2>
          </header>
          <div className="din-tetos-grade">
            {TETOS.map((c) => (
              <Teto key={c.chave} c={c} />
            ))}
          </div>
        </section>

        <section className="adm-bloco din-cotacao" aria-labelledby="din-cot">
          <header>
            <h2 id="din-cot">Cotação do dólar</h2>
          </header>
          <div className="din-cotacao-corpo">
            <p className="din-cotacao-valor">
              {cot === null ? (
                <span className="din-nao">não declarada</span>
              ) : (
                <>
                  <span className="din-moeda">R$</span>
                  <b className="ds-num">{cot.toFixed(2).replace(".", ",")}</b>
                  <span className="din-moeda">por US$ 1</span>
                </>
              )}
            </p>
            <p className="din-origem">
              <span className={`din-origem-ponto din-origem-ponto--${cot === null ? "padrao" : "banco"}`} aria-hidden />
              {procedencia(cot, COTACAO.declaradaHa)}
            </p>
            <p className="din-desc">A fatura do provedor é em dólar; a decisão de rodar é em real. A cotação é declarada, não buscada — e todo valor convertido sai com “≈” e com a data desta declaração.</p>
            <form className="din-campo" onSubmit={(e) => e.preventDefault()}>
              <span className="din-prefixo">R$</span>
              <input value={cotacao} onChange={(e) => setCotacao(e.target.value)} inputMode="decimal" placeholder="ex.: 5,42" aria-label="Reais por US$ 1" />
              <Botao variante="ghost" tamanho="sm" type="submit">
                Declarar
              </Botao>
            </form>
          </div>
        </section>
      </div>

      <section className="adm-numeros din-numeros" aria-label="Fatura do provedor no período">
        <Num rotulo="Gasto" valor={usd(t.usd)} detalhe={cot === null ? `Últimos ${periodo} dias` : `${brl(t.usd, cot)} · últimos ${periodo} dias`} />
        <Num rotulo="Tokens" valor={num(t.entrada + t.saida)} detalhe={`${num(t.entrada)} entrada / ${num(t.saida)} saída`} />
        <Num rotulo="Chamadas" valor={num(t.chamadas)} detalhe="Chamadas de modelo registradas pela OpenAI" />
        <Num rotulo="Cache" valor={num(t.cache)} detalhe="Tokens de entrada com cache" />
      </section>

      <div className="adm-duas din-duas">
        <section className="adm-bloco" aria-labelledby="din-dia">
          <header>
            <h2 id="din-dia">Uso diário</h2>
            <span className="adm-fraco">Cada barra é um dia: a altura são os tokens. O custo aparece em USD.</span>
          </header>
          <div className="din-barras" role="img" aria-label="Tokens e custo por dia">
            {DIAS.map((d, i) => (
              <div key={d.dia} className={`din-barra${i === DIAS.length - 1 ? " din-barra--hoje" : ""}`} title={`${num(d.tokens)} tokens · ${usd(d.usd)}`}>
                <span className="din-barra-poço">
                  <i style={{ height: `${Math.max(3, (d.tokens / maxTokens) * 100)}%` }} />
                </span>
                <span className="din-barra-dia ds-num">{d.dia}</span>
                <span className="din-barra-usd ds-num">{usd(d.usd)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="adm-bloco" aria-labelledby="din-mod">
          <header>
            <h2 id="din-mod">Modelos</h2>
          </header>
          <div className="adm-tabela din-tabela--modelos">
            {MODELOS.map((m) => (
              <div key={m.modelo} className="adm-linha">
                <span className="mp-mono">{m.modelo}</span>
                <span className="adm-fraco ds-num">{num(m.tokens)} tokens</span>
                <span className="adm-fraco ds-num">{num(m.chamadas)} chamadas</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="adm-bloco" aria-labelledby="din-itens">
        <header>
          <h2 id="din-itens">Itens de custo</h2>
        </header>
        <div className="adm-tabela din-tabela--itens">
          {ITENS_DE_CUSTO.map((i) => (
            <div key={i.item} className="adm-linha">
              <span>{i.item}</span>
              <span className="ds-num din-direita">{usd(i.usd)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="adm-bloco" aria-labelledby="din-obra">
        <header>
          <h2 id="din-obra">Custo por obra</h2>
          {semPreco && <span className="din-selo">amostra: os {INTERNO.limite} eventos mais recentes</span>}
        </header>
        <p className="din-lede">O mesmo consumo, cortado pela pergunta que o escritório faz: quanto custou entregar este projeto. A obra é a pasta da conversa; conversa fora de pasta conta como obra de uma conversa só.</p>
        <div className="adm-tabela din-tabela--obras">
          <div className="adm-linha din-cab">
            <span>Obra</span>
            <span className="din-direita">Conversas</span>
            <span className="din-direita">Tokens</span>
            <span className="din-direita">Custo</span>
          </div>
          {OBRAS.map((o) => (
            <div key={o.chave} className="adm-linha">
              <span className="adm-tit">
                <b className={o.origem === "sem-vinculo" || o.origem === "conversa-removida" ? "adm-fraco" : undefined}>{o.obra}</b>
                <small>
                  {ORIGEM_DA_OBRA[o.origem]} · {num(o.chamadas)} chamadas
                </small>
              </span>
              <span className="adm-fraco ds-num din-direita">{o.conversas || "—"}</span>
              <span className="adm-fraco ds-num din-direita">{num(o.tokens)}</span>
              <span className="ds-num din-direita din-custo">
                {usd(o.usd)}
                {cot !== null && <small>{brl(o.usd, cot)}</small>}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="adm-bloco" aria-labelledby="din-int">
        <header>
          <h2 id="din-int">Uso interno por tarefa</h2>
          <span className="ds-num din-interno-total">
            {num(INTERNO.eventos)} eventos · {piso}
            {usd(INTERNO.usd)}
            {cot !== null ? ` · ${brl(INTERNO.usd, cot)}` : ""}
          </span>
        </header>
        <p className="din-lede">Eventos gravados pelo Nexo por fluxo, tarefa e chamada de IA.</p>
        {semPreco && (
          <p className="din-ressalva">
            <Info size={14} aria-hidden />
            <span>
              {num(INTERNO.semPreco)} de {num(INTERNO.eventos)} chamadas não têm preço na tabela e entram como zero ({num(INTERNO.tokensSemPreco)} tokens fora da conta). Sem preço não é de graça — some o modelo em{" "}
              <span className="mp-mono">{INTERNO.modelosSemPreco.join(", ")}</span>.
            </span>
          </p>
        )}
        <div className="din-fluxos">
          {FLUXOS.map((f) => (
            <div key={f.fluxo} className="din-fluxo">
              <p>
                <span className="mp-mono">{f.fluxo}</span>
                <b className="ds-num">
                  {semPreco && f.semPreco > 0 ? "≥ " : ""}
                  {usd(f.usd)}
                </b>
              </p>
              <small className="ds-num">
                {num(f.tokens)} tokens · {num(f.chamadas)} chamadas
                {semPreco && f.semPreco > 0 ? ` · ${num(f.semPreco)} sem preço` : ""}
              </small>
            </div>
          ))}
        </div>
        <div className="adm-tabela din-tabela--tarefas">
          <div className="adm-linha din-cab">
            <span>Tarefa</span>
            <span>Fluxo</span>
            <span className="din-direita">Tokens</span>
            <span className="din-direita">Custo est.</span>
          </div>
          {TAREFAS.map((t) => (
            <div key={t.tarefa} className="adm-linha">
              <span>{t.tarefa}</span>
              <span className="mp-mono adm-fraco">{t.fluxo}</span>
              <span className="adm-fraco ds-num din-direita">{num(t.tokens)}</span>
              <span className="ds-num din-direita">{usd(t.usd)}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
