"use client";

import { Info } from "lucide-react";
import { useState } from "react";

import { Botao } from "@/components/ds/basicos";
import { BarraDividida, BarraEmbutida, LinhaDeTendencia, MedidorDeTeto, OndaDeGasto } from "@/components/ds/medidas";

import {
  brl,
  COTACAO,
  doPeriodo,
  escalaDo,
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
  totaisDo,
  usd,
  type Controle,
} from "./dados-dinheiro";

/*
 * DINHEIRO: quanto custou, contra que teto, e por obra. A ordem é a do app
 * (teto e cotação abrem a tela, depois a fatura, depois o consumo interno).
 * Os gráficos são os da biblioteca (components/ds/medidas, no idioma da Matos
 * UI) e todos leem o mesmo recorte do período: trocar 7/14/30 dias muda a
 * régua, a onda e as tabelas juntas. O real vem colado no dólar, com "≈".
 */

export type VarianteDinheiro = "normal" | "sem-cotacao" | "sem-preco";

function Teto({ c, cot }: { c: Controle; cot: number | null }) {
  const [valor, setValor] = useState(c.valor === null ? "" : String(c.valor));
  const doSistema = c.chave === "teto.global.usd";
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
      {doSistema && c.valor !== null && (
        <div className="din-medidor-lugar" title="O gasto do mês que o veredito do trilho já mostra">
          <MedidorDeTeto
            valor={GASTO_DO_MES_USD}
            teto={c.valor}
            rotulo={
              <>
                {usd(GASTO_DO_MES_USD)} de {usd(c.valor)} em setembro{cot !== null ? ` · ${brl(GASTO_DO_MES_USD, cot)}` : ""}
              </>
            }
          />
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

function Num({ rotulo, valor, detalhe, serie }: { rotulo: string; valor: string; detalhe: string; serie: number[] }) {
  return (
    <div className="adm-num adm-num--fixo din-num">
      <span className="adm-num-rotulo">{rotulo}</span>
      <b className="ds-num">{valor}</b>
      <span className="adm-num-detalhe">{detalhe}</span>
      <span className="din-num-linha">
        <LinhaDeTendencia valores={serie} />
      </span>
    </div>
  );
}

export function Dinheiro({ variante, periodo }: { variante: VarianteDinheiro; periodo: number }) {
  const cot = variante === "sem-cotacao" ? null : COTACAO.valor;
  const [cotacao, setCotacao] = useState(cot === null ? "" : String(cot).replace(".", ","));
  const dias = doPeriodo(periodo);
  const t = totaisDo(periodo);
  const f = escalaDo(periodo);
  const semPreco = variante === "sem-preco";
  const piso = semPreco ? "≥ " : "";
  const maxObra = Math.max(...OBRAS.map((o) => o.usd));
  const maxFluxo = Math.max(...FLUXOS.map((x) => x.usd));
  const maxTarefa = Math.max(...TAREFAS.map((x) => x.usd));
  const itens = ITENS_DE_CUSTO.map((i) => ({ ...i, usd: +(i.parte * t.usd).toFixed(2) }));

  return (
    <>
      <div className="din-topo">
        <section className="adm-bloco din-tetos" aria-labelledby="din-teto">
          <header>
            <h2 id="din-teto">Teto de gasto</h2>
          </header>
          <div className="din-tetos-grade">
            {TETOS.map((c) => (
              <Teto key={c.chave} c={c} cot={cot} />
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
        <Num rotulo="Gasto" valor={usd(t.usd)} detalhe={cot === null ? `Últimos ${periodo} dias` : `${brl(t.usd, cot)} · últimos ${periodo} dias`} serie={dias.map((d) => d.usd)} />
        <Num rotulo="Tokens" valor={num(t.tokens)} detalhe={`${num(t.entrada)} entrada / ${num(t.saida)} saída`} serie={dias.map((d) => d.tokens)} />
        <Num rotulo="Chamadas" valor={num(t.chamadas)} detalhe="Chamadas de modelo registradas pela OpenAI" serie={dias.map((d) => d.chamadas)} />
        <Num rotulo="Cache" valor={num(t.cache)} detalhe="Tokens de entrada com cache" serie={dias.map((d) => d.cache)} />
      </section>

      <div className="adm-duas din-duas">
        <section className="adm-bloco" aria-labelledby="din-dia">
          <header>
            <h2 id="din-dia">Uso diário</h2>
            <span className="adm-fraco">cada coluna é um dia; a altura é o custo</span>
          </header>
          <div className="din-onda">
            <OndaDeGasto
              key={periodo}
              dias={dias.map((d) => ({
                eixo: d.dia,
                valor: d.usd,
                rotulo: (
                  <>
                    <b className="ds-num">{usd(d.usd)}</b> em {d.dia} · {num(d.tokens)} tokens · {num(d.chamadas)} chamadas
                  </>
                ),
              }))}
              padrao={
                <>
                  <b className="ds-num">{usd(t.usd)}</b> em {periodo} dias · média de {usd(t.usd / periodo)} por dia
                </>
              }
            />
            <div className="din-tokens">
              <p className="din-sub">Do que são feitos os tokens</p>
              <BarraDividida
                key={periodo}
                partes={[
                  { id: "entrada", rotulo: "Entrada, sem cache", valor: t.entrada - t.cache, texto: num(t.entrada - t.cache) },
                  { id: "cache", rotulo: "Entrada com cache", valor: t.cache, texto: num(t.cache) },
                  { id: "saida", rotulo: "Saída", valor: t.saida, texto: num(t.saida) },
                ]}
              />
            </div>
          </div>
        </section>

        <section className="adm-bloco" aria-labelledby="din-mod">
          <header>
            <h2 id="din-mod">Modelos</h2>
            <span className="adm-fraco">tokens no período</span>
          </header>
          <div className="din-modelos">
            <BarraDividida
              key={periodo}
              partes={MODELOS.map((m) => ({ id: m.modelo, rotulo: m.modelo, valor: m.parteTokens, texto: num(Math.round(m.parteTokens * t.tokens)) }))}
            />
            <div className="adm-tabela din-tabela--modelos">
              {MODELOS.map((m) => (
                <div key={m.modelo} className="adm-linha">
                  <span className="mp-mono">{m.modelo}</span>
                  <span className="adm-fraco ds-num din-direita">{num(Math.round(m.parteChamadas * t.chamadas))} chamadas</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="adm-bloco" aria-labelledby="din-itens">
        <header>
          <h2 id="din-itens">Itens de custo</h2>
        </header>
        <div className="adm-tabela din-tabela--itens">
          {itens.map((i) => (
            <div key={i.item} className="adm-linha">
              <span>{i.item}</span>
              <BarraEmbutida key={periodo} valor={i.usd} maximo={itens[0].usd} />
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
            <span />
            <span className="din-direita">Conversas</span>
            <span className="din-direita">Tokens</span>
            <span className="din-direita">Custo</span>
          </div>
          {OBRAS.map((o) => (
            <div key={o.chave} className="adm-linha">
              <span className="adm-tit">
                <b className={o.origem === "sem-vinculo" || o.origem === "conversa-removida" ? "adm-fraco" : undefined}>{o.obra}</b>
                <small>
                  {ORIGEM_DA_OBRA[o.origem]} · {num(Math.round(o.chamadas * f))} chamadas
                </small>
              </span>
              <BarraEmbutida key={periodo} valor={o.usd} maximo={maxObra} />
              <span className="adm-fraco ds-num din-direita">{o.conversas || "—"}</span>
              <span className="adm-fraco ds-num din-direita">{num(Math.round(o.tokens * f))}</span>
              <span className="ds-num din-direita din-custo">
                {usd(o.usd * f)}
                {cot !== null && <small>{brl(o.usd * f, cot)}</small>}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="adm-bloco" aria-labelledby="din-int">
        <header>
          <h2 id="din-int">Uso interno por tarefa</h2>
          <span className="ds-num din-interno-total">
            {num(Math.round(INTERNO.eventos * f))} eventos · {piso}
            {usd(INTERNO.usd * f)}
            {cot !== null ? ` · ${brl(INTERNO.usd * f, cot)}` : ""}
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
        <div className="din-colunas">
          <div className="adm-tabela din-tabela--fluxos">
            <div className="adm-linha din-cab">
              <span>Fluxo</span>
              <span />
              <span className="din-direita">Custo est.</span>
            </div>
            {FLUXOS.map((x) => (
              <div key={x.fluxo} className="adm-linha">
                <span className="adm-tit">
                  <b className="mp-mono">{x.fluxo}</b>
                  <small className="ds-num">
                    {num(Math.round(x.tokens * f))} tokens · {num(Math.round(x.chamadas * f))} chamadas
                    {semPreco && x.semPreco > 0 ? ` · ${num(x.semPreco)} sem preço` : ""}
                  </small>
                </span>
                <BarraEmbutida key={periodo} valor={x.usd} maximo={maxFluxo} />
                <span className="ds-num din-direita">
                  {semPreco && x.semPreco > 0 ? "≥ " : ""}
                  {usd(x.usd * f)}
                </span>
              </div>
            ))}
          </div>
          <div className="adm-tabela din-tabela--tarefas">
            <div className="adm-linha din-cab">
              <span>Tarefa</span>
              <span />
              <span className="din-direita">Custo est.</span>
            </div>
            {TAREFAS.map((x) => (
              <div key={x.tarefa} className="adm-linha">
                <span className="adm-tit">
                  <b>{x.tarefa}</b>
                  <small>
                    <span className="mp-mono">{x.fluxo}</span> · {num(Math.round(x.tokens * f))} tokens
                  </small>
                </span>
                <BarraEmbutida key={periodo} valor={x.usd} maximo={maxTarefa} />
                <span className="ds-num din-direita">{usd(x.usd * f)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
