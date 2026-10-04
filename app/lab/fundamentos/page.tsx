import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { AmostraDeCor } from "../_lab/amostra-de-cor";
import { PlaygroundDeMovimento } from "../_lab/playground-de-movimento";

export const metadata = { title: "Fundamentos — Laboratório" };

const FUNDOS = [
  { token: "--ds-surface-page", nome: "página" },
  { token: "--ds-surface-card", nome: "cartão" },
  { token: "--ds-surface-raised", nome: "erguida" },
];

function Secao({ id, titulo, children, texto }: { id: string; titulo: string; texto: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="lab-secao" id={id}>
      <div className="lab-secao-cabeca">
        <div>
          <h2>{titulo}</h2>
          <p>{texto}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

const grade = (min: number): React.CSSProperties => ({
  display: "grid",
  gap: 12,
  gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
});

export default function Fundamentos() {
  return (
    <>
      <header className="lab-cabeca">
        <p className="lab-trilha">Bastidores</p>
        <h1>Fundamentos</h1>
        <p className="lab-lede">
          As decisões de base, das quais todo componente e toda tela derivam. Cada valor aqui é lido ao vivo do{" "}
          <span className="ds-code">app/ds.css</span>: o que você aprova é o que o código usa.
        </p>
      </header>

      <Secao
        id="principios"
        titulo="Princípios"
        texto="Seis regras que decidem os casos que nenhuma especificação prevê. Quando duas opções parecerem boas, vence a que obedece a estas."
      >
        <ol style={{ ...grade(320), listStyle: "none", margin: 0, padding: 0 }}>
          {[
            ["Uma cor viva, com sentido", "O violeta diz só quatro coisas: o Nexo está aqui, o Nexo está trabalhando, isto está selecionado, isto tem foco. Nunca decora."],
            ["A ação principal é clara", "Uma pílula clara por tela, no máximo. Se há duas, uma delas não é a principal."],
            ["Movimento responde a uma pergunta", "O que mudou, para onde foi, deu certo, está trabalhando. Animação que não responde a nenhuma não entra."],
            ["O documento manda", "Código de obra, página, revisão e carimbo aparecem como o engenheiro os escreve. Mono só para dado de verdade."],
            ["Sem rótulo em caixa alta", "Hierarquia vem de tamanho, peso e espaço. Caixa alta grita e deixa a leitura mais lenta."],
            ["O que é da obra é da obra", "Cor de prefeitura e de disciplina identificam a obra e o documento; nunca viram cor de interface."],
          ].map(([t, d], i) => (
            <li key={t} className="lab-cartao" style={{ padding: 18, display: "grid", gap: 6, alignContent: "start" }}>
              <span className="lab-nota ds-num">{i + 1}</span>
              <b style={{ fontWeight: 500, fontSize: "var(--ds-text-md)" }}>{t}</b>
              <span style={{ color: "var(--ds-text-secondary)", fontSize: "var(--ds-text-xs)" }}>{d}</span>
            </li>
          ))}
        </ol>
      </Secao>

      <Secao
        id="cor.superficies"
        titulo="Superfícies"
        texto="Cinco planos, do fundo para a frente. Cada degrau é um lugar físico, e o componente escolhe o plano pelo que ele é, não pela aparência que se quer."
      >
        <div style={grade(200)}>
          <AmostraDeCor alta token="--ds-surface-page" nome="Página" papel="O chão de toda tela." />
          <AmostraDeCor alta token="--ds-surface-sunken" nome="Afundada" papel="Trilho, barra lateral, poço de campo, área de soltar." />
          <AmostraDeCor alta token="--ds-surface-card" nome="Cartão" papel="Grupo de conteúdo: projeto, achado, parecer." />
          <AmostraDeCor alta token="--ds-surface-raised" nome="Erguida" papel="Item selecionado, linha aberta, menu." />
          <AmostraDeCor alta token="--ds-surface-overlay" nome="Flutuante" papel="Diálogo, popover, aviso. Sempre com sombra." />
        </div>
        <div className="lab-cartao" style={{ marginTop: 12, padding: 18, background: "var(--ds-surface-page)" }}>
          <p className="lab-nota" style={{ margin: "0 0 10px" }}>Os cinco planos empilhados, como aparecem numa tela.</p>
          <div style={{ padding: 16, borderRadius: "var(--ds-radius-panel)", background: "var(--ds-surface-sunken)", boxShadow: "var(--ds-edge)" }}>
            <div style={{ padding: 16, borderRadius: "var(--ds-radius-card)", background: "var(--ds-surface-card)", boxShadow: "var(--ds-edge)", display: "grid", gap: 8 }}>
              <div style={{ padding: "10px 12px", borderRadius: "var(--ds-radius-row)", background: "var(--ds-surface-raised)", boxShadow: "var(--ds-edge-strong)", fontSize: 13 }}>
                Volumes divergentes entre memorial e quadro <span className="lab-nota">p. 14</span>
              </div>
              <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--ds-text-secondary)" }}>Revisão B no carimbo, revisão A na capa</div>
              <div style={{ justifySelf: "end", padding: "8px 12px", borderRadius: "var(--ds-radius-row)", background: "var(--ds-surface-overlay)", boxShadow: "var(--ds-shadow-float)", fontSize: 12.5 }}>
                Atribuir a Marcos Ribeiro
              </div>
            </div>
          </div>
        </div>
      </Secao>

      <Secao
        id="cor.texto"
        titulo="Texto"
        texto={<>Três tons. O terciário foi corrigido: o <b>#6C717C</b> da proposta reprovava para texto pequeno (4,07:1); o <b>#80858F</b> passa em todos os planos.</>}
      >
        <div style={grade(260)}>
          <AmostraDeCor token="--ds-text-primary" nome="Primário" papel="Títulos, conteúdo, o que se lê." sobre={FUNDOS} />
          <AmostraDeCor token="--ds-text-secondary" nome="Secundário" papel="Explicação, metadado útil." sobre={FUNDOS} />
          <AmostraDeCor token="--ds-text-tertiary" nome="Terciário" papel="Hora, contagem, dica. O mínimo legível." sobre={FUNDOS} />
        </div>
      </Secao>

      <Secao
        id="cor.linhas"
        titulo="Linhas"
        texto="Borda é luz, não cor: branco em alfa baixo, desenhado por dentro. Não ocupa pixel de layout, então ícone e texto não desalinham quando a borda aparece."
      >
        <div style={grade(240)}>
          <AmostraDeCor token="--ds-line-subtle" nome="Sutil" papel="Contorno de cartão, divisória de lista." />
          <AmostraDeCor token="--ds-line-default" nome="Padrão" papel="Campo, botão secundário, item selecionado." />
          <AmostraDeCor token="--ds-line-strong" nome="Forte" papel="Área de soltar tracejada, hover de cartão." />
        </div>
      </Secao>

      <Secao
        id="cor.nexo"
        titulo="Cor do Nexo e ação principal"
        texto="O violeta, a cor do aro do orbe, é o único sinal vivo da tela. A ação principal não usa cor: é a pílula clara. Assim os dois nunca disputam."
      >
        <div style={grade(240)}>
          <AmostraDeCor token="--ds-nexo" nome="Nexo" papel="Presença, trabalho em curso, seleção." sobre={FUNDOS} piso={3} />
          <AmostraDeCor token="--ds-nexo-strong" nome="Nexo forte" papel="Preenchimento: barra de progresso, chave ligada." />
          <AmostraDeCor token="--ds-nexo-wash" nome="Véu do Nexo" papel="Fundo de selo e de conversa ativa." />
          <AmostraDeCor token="--ds-action-bg" nome="Ação principal" papel="A pílula clara. Uma por tela." sobre={[{ token: "--ds-action-fg", nome: "texto" }]} />
        </div>
        <div className="lab-cartao" style={{ marginTop: 12, padding: 18, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button type="button" style={{ height: 34, padding: "0 16px", border: 0, borderRadius: 999, background: "var(--ds-action-bg)", color: "var(--ds-action-fg)", font: "inherit", fontWeight: 500 }}>
            Auditar
          </button>
          <button type="button" style={{ height: 34, padding: "0 16px", border: 0, borderRadius: 999, background: "none", boxShadow: "var(--ds-edge-strong)", color: "var(--ds-text-primary)", font: "inherit", fontWeight: 500 }}>
            Agora não
          </button>
          <span className="lab-pilula" style={{ background: "var(--ds-nexo-wash)", color: "var(--ds-nexo)" }}>
            <span style={{ width: 6, height: 6, borderRadius: 9, background: "currentColor" }} />
            Auditando
          </span>
          <span className="lab-nota">Uma ação clara, uma recusa em contorno, e o violeta dizendo que o Nexo trabalha.</span>
        </div>
      </Secao>

      <Secao
        id="cor.gravidade"
        titulo="Gravidade"
        texto="Os três degraus do parecer, com os nomes que o parecer já usa. Cada um tem cor cheia, véu e contorno; a cor cheia nunca aparece sem o texto dizendo o degrau."
      >
        <div style={grade(260)}>
          <AmostraDeCor token="--ds-sev-block" nome="Bloqueia a emissão" papel="Corrigir antes de gerar o documento." sobre={FUNDOS} />
          <AmostraDeCor token="--ds-sev-decide" nome="Exige decisão técnica" papel="Não impede gerar, mas precisa de aceite do responsável." sobre={FUNDOS} />
          <AmostraDeCor token="--ds-sev-note" nome="Revisão de texto" papel="Não muda a decisão técnica." sobre={FUNDOS} />
        </div>
      </Secao>

      <Secao
        id="cor.estado"
        titulo="Estado do sistema"
        texto="O que o sistema diz sobre si: gravou, avisou, precisa de atenção, falhou. Mesmo tom da gravidade em atenção e erro, papel diferente: “salvo só nesta máquina” não é um achado."
      >
        <div style={grade(220)}>
          <AmostraDeCor token="--ds-state-ok" nome="Certo" papel="Gravado, corrigido, volume montado." sobre={FUNDOS} />
          <AmostraDeCor token="--ds-state-info" nome="Informação" papel="Comparado com a auditoria anterior." sobre={FUNDOS} />
          <AmostraDeCor token="--ds-state-attention" nome="Atenção" papel="Salvo só nesta máquina, análise parcial." sobre={FUNDOS} />
          <AmostraDeCor token="--ds-state-error" nome="Erro" papel="Não deu para abrir, falhou." sobre={FUNDOS} />
        </div>
      </Secao>

      <Secao
        id="cor.disciplinas"
        titulo="Disciplinas"
        texto="Preservadas do sistema atual, sem mudança: já eram dessaturadas e distinguíveis. Identificam a folha e o achado pela disciplina, nunca viram cor de botão."
      >
        <div style={grade(160)}>
          {[
            ["ARQ", "Arquitetônico", "--ds-disc-arq"],
            ["EST", "Estrutural, fundações", "--ds-disc-est"],
            ["HID", "Hidrossanitário", "--ds-disc-hid"],
            ["ELE", "Elétrico, CFTV", "--ds-disc-ele"],
            ["PCI", "Preventivo de incêndio", "--ds-disc-pci"],
            ["CLI", "Climatização, gases", "--ds-disc-cli"],
            ["TER", "Terraplenagem, drenagem", "--ds-disc-ter"],
            ["PAI", "Paisagismo", "--ds-disc-pai"],
          ].map(([s, n, t]) => (
            <div key={s} className="lab-cartao" style={{ padding: 14, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: `var(${t})` }} />
                <b style={{ fontWeight: 500, fontFamily: "var(--ds-font-mono)", fontSize: 12.5 }}>{s}</b>
              </div>
              <span className="lab-nota">{n}</span>
              <span style={{ justifySelf: "start", fontSize: 11.5, padding: "1px 7px", borderRadius: 6, color: `var(${t})`, background: `color-mix(in oklab, var(${t}) 14%, transparent)` }}>
                {s}-01
              </span>
            </div>
          ))}
        </div>
      </Secao>

      <Secao
        id="cor.prefeituras"
        titulo="Prefeituras"
        texto="Preservadas: as cores de cada município e as quatro formas da marca (sinal, selo, bastão, chapa). É a única cor da obra que aparece fora do documento, e sempre ao lado do nome da cidade."
      >
        <div style={grade(210)}>
          {[
            ["Florianópolis", "FLORIANOPOLIS"],
            ["São José", "SAO JOSE"],
            ["Criciúma", "CRICIUMA"],
            ["Chapecó", "CHAPECO"],
            ["Urubici", "URUBICI"],
            ["Não reconhecida", "Cidade qualquer"],
          ].map(([nome, chave]) => (
            <div key={nome} className="lab-cartao" style={{ padding: 16, display: "grid", gap: 12 }}>
              <b style={{ fontWeight: 500 }}>{nome}</b>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <MarcaDaPrefeitura prefeitura={chave} forma="sinal" />
                <MarcaDaPrefeitura prefeitura={chave} forma="selo" />
                <MarcaDaPrefeitura prefeitura={chave} forma="bastao" />
                <MarcaDaPrefeitura prefeitura={chave} forma="chapa" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <MarcaDaPrefeitura prefeitura={chave} forma="sinal" />
                <span className="ds-code">117-25</span>
                <span style={{ color: "var(--ds-text-secondary)" }}>{nome}</span>
              </div>
            </div>
          ))}
        </div>
      </Secao>

      <Secao
        id="tipo"
        titulo="Tipografia"
        texto="Geist para tudo, Geist Mono só para dado de verdade (código de obra, página, tempo). Títulos leves e grandes, corpo em 14. Nenhum rótulo em caixa alta."
      >
        <div className="lab-cartao" style={{ padding: "6px 0" }}>
          {[
            ["display", "44 / 300 / −0,04em", "Não emitir ainda", { fontSize: 44, fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1.05 }],
            ["3xl", "32 / 400 / −0,035em", "Auditoria em curso", { fontSize: 32, fontWeight: 400, letterSpacing: "-0.035em", lineHeight: 1.1 }],
            ["2xl", "24 / 400 / −0,025em", "Parecer técnico da auditoria", { fontSize: 24, fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.2 }],
            ["xl", "20 / 500 / −0,02em", "Volumes divergentes entre memorial e quadro", { fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.25 }],
            ["lg", "17 / 500 / −0,015em", "Muro de contenção da Rua Anita Garibaldi", { fontSize: 17, fontWeight: 500, letterSpacing: "-0.015em" }],
            ["md", "15 / 400", "O capítulo 3 descreve 48,60 m³ de concreto fck 25 MPa para blocos e vigas baldrame.", { fontSize: 15 }],
            ["sm (corpo)", "14 / 400", "O quadro do capítulo 9 soma 42,10 m³ para o mesmo item. A quantidade vai para o orçamento e a licitação.", { fontSize: 14 }],
            ["xs", "13 / 400", "Buscar por texto, referência ou página", { fontSize: 13, color: "var(--ds-text-secondary)" }],
            ["2xs", "12 / 400", "Atualizado hoje às 21:14", { fontSize: 12, color: "var(--ds-text-tertiary)" }],
            ["mono", "12 / 400", "117-25   INC-002   p. 14   2min 41s", { fontSize: 12, fontFamily: "var(--ds-font-mono)", color: "var(--ds-text-secondary)" }],
          ].map(([nome, medida, texto, estilo]) => (
            <div
              key={nome as string}
              style={{ display: "grid", gridTemplateColumns: "120px 170px minmax(0, 1fr)", gap: 20, alignItems: "baseline", padding: "14px 20px", borderTop: "1px solid var(--ds-line-subtle)" }}
            >
              <span style={{ fontSize: 13 }}>{nome as string}</span>
              <span className="lab-nota ds-num" style={{ fontFamily: "var(--ds-font-mono)", fontSize: 11.5 }}>
                {medida as string}
              </span>
              <span style={{ ...(estilo as React.CSSProperties), textWrap: "balance" }}>{texto as string}</span>
            </div>
          ))}
        </div>
      </Secao>

      <Secao id="espaco" titulo="Espaço" texto="Base 4. Dentro de um controle: 4 a 12. Entre itens de uma lista: 8 a 12. Entre seções: 32 a 48. Nada fora da escala.">
        <div className="lab-cartao" style={{ padding: 18, display: "grid", gap: 8 }}>
          {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((n) => (
            <div key={n} style={{ display: "grid", gridTemplateColumns: "120px 60px 1fr", alignItems: "center", gap: 12 }}>
              <span className="ds-code" style={{ justifySelf: "start" }}>--ds-space-{n}</span>
              <span className="lab-nota ds-num">{n * 4} px</span>
              <span style={{ height: 10, width: n * 4, borderRadius: 3, background: "var(--ds-nexo-wash)", boxShadow: "inset 0 0 0 1px var(--ds-nexo-line)" }} />
            </div>
          ))}
        </div>
      </Secao>

      <Secao
        id="raio"
        titulo="Raio"
        texto="Por papel, não por tamanho: o raio diz o que a peça é. O chanfro sai inteiro; o raio só não entra no que é do documento (folha, carimbo, tabela do PDF)."
      >
        <div style={{ ...grade(130), gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
          {[
            ["tag", 6, "Código, sigla, tecla"],
            ["control", 10, "Campo, item de menu"],
            ["row", 12, "Linha de lista, aviso"],
            ["card", 16, "Cartão"],
            ["panel", 18, "Barra lateral, palco"],
            ["composer", 22, "Compositor do chat"],
            ["pill", 999, "Botão, selo, segmento"],
          ].map(([n, r, uso]) => (
            <div key={n as string} className="lab-cartao" style={{ padding: 14, display: "grid", gap: 10 }}>
              <div style={{ height: 56, borderRadius: r as number, background: "var(--ds-surface-raised)", boxShadow: "var(--ds-edge-strong)" }} />
              <b style={{ fontWeight: 500, fontSize: 13 }}>{n as string}</b>
              <span className="lab-nota ds-num">{r === 999 ? "pílula" : `${r} px`}. {uso as string}</span>
            </div>
          ))}
        </div>
      </Secao>

      <Secao
        id="elevacao"
        titulo="Elevação"
        texto="Três níveis. No plano, só a borda de luz. Flutuando, borda e sombra longa e escura. Nunca sombra cinza clara, nunca brilho colorido."
      >
        <div style={{ ...grade(220), padding: 24, borderRadius: "var(--ds-radius-card)", background: "var(--ds-surface-sunken)" }}>
          {[
            ["Plano", "--ds-edge", "Cartão, linha."],
            ["Destacado", "--ds-edge-strong", "Selecionado, campo."],
            ["Flutuando", "--ds-shadow-float", "Aviso, folha no mapa."],
            ["Sobreposto", "--ds-shadow-overlay", "Menu, diálogo."],
          ].map(([n, t, uso]) => (
            <div key={n} style={{ padding: 18, borderRadius: "var(--ds-radius-card)", background: "var(--ds-surface-card)", boxShadow: `var(${t})`, display: "grid", gap: 6 }}>
              <b style={{ fontWeight: 500 }}>{n}</b>
              <span className="ds-code" style={{ justifySelf: "start", fontSize: 11 }}>{t}</span>
              <span className="lab-nota">{uso}</span>
            </div>
          ))}
        </div>
      </Secao>

      <Secao
        id="movimento"
        titulo="Movimento"
        texto={<>Cinco durações, quatro curvas, três molas. Só <b>transform</b> e <b>opacity</b> animam. Ligue a câmera lenta no trilho para julgar as rápidas, e o movimento reduzido para conferir que tudo continua compreensível sem ele.</>}
      >
        <PlaygroundDeMovimento />
      </Secao>

      <Secao
        id="foco"
        titulo="Foco"
        texto="Anel violeta de 2 px, afastado 2 px, só quando o foco vem do teclado. Aperte Tab para percorrer os controles abaixo."
      >
        <div className="lab-cartao" style={{ padding: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" style={{ height: 34, padding: "0 16px", border: 0, borderRadius: 999, background: "var(--ds-action-bg)", color: "var(--ds-action-fg)", font: "inherit", fontWeight: 500 }}>
            Confirmar e gerar
          </button>
          <button type="button" style={{ height: 34, padding: "0 16px", border: 0, borderRadius: 999, background: "none", boxShadow: "var(--ds-edge-strong)", color: "var(--ds-text-primary)", font: "inherit" }}>
            Ajustar escopo
          </button>
          <input
            aria-label="Exemplo de campo"
            placeholder="Buscar obra ou código"
            style={{ height: 34, padding: "0 12px", border: 0, borderRadius: "var(--ds-radius-control)", background: "var(--ds-surface-sunken)", boxShadow: "var(--ds-edge-strong)", color: "var(--ds-text-primary)", font: "inherit", width: 240 }}
          />
          <a href="#foco" style={{ color: "var(--ds-nexo)", fontSize: 13 }}>
            Ver todos os projetos
          </a>
        </div>
      </Secao>
    </>
  );
}
