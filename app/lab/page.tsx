import Link from "next/link";

export default function ComecarAqui() {
  return (
    <>
      <header className="lab-cabeca">
        <p className="lab-trilha">Laboratório</p>
        <h1>Aprovar o redesenho, tela por tela</h1>
        <p className="lab-lede">
          Cada tela do Nexo aparece aqui já no visual novo, funcionando. Você olha, clica e decide. Nada muda no app até
          você aprovar.
        </p>
      </header>

      <section className="lab-secao">
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          {[
            ["Abra uma tela", "No menu à esquerda, em “Telas para aprovar”. A primeira pronta é o Painel."],
            ["Passe pelas situações", "Os botões numerados em cima da tela mostram cada caso: dia normal, carregando, deu erro, primeiro acesso. Clique em tudo."],
            ["Decida cada situação", "Aprovado, ou Pedir mudança com uma frase dizendo o quê. Um ponto verde ou amarelo marca o que você já decidiu."],
          ].map(([t, d], i) => (
            <li key={t} className="lab-cartao" style={{ padding: 20, display: "grid", gap: 8, alignContent: "start" }}>
              <span className="lab-nota ds-num">Passo {i + 1}</span>
              <b style={{ fontWeight: 500, fontSize: "var(--ds-text-lg)" }}>{t}</b>
              <span style={{ color: "var(--ds-text-secondary)" }}>{d}</span>
            </li>
          ))}
        </ol>
        <div style={{ marginTop: 20 }}>
          <Link
            href="/lab/telas/painel"
            style={{ display: "inline-flex", alignItems: "center", height: 36, padding: "0 18px", borderRadius: 999, background: "var(--ds-action-bg)", color: "var(--ds-action-fg)", fontWeight: 500, textDecoration: "none" }}
          >
            Começar pelo Painel
          </Link>
        </div>
      </section>

      <section className="lab-secao">
        <p className="lab-nota" style={{ maxWidth: "70ch" }}>
          Dica: a chave “Câmera lenta” no canto inferior esquerdo deixa as animações 4 vezes mais lentas, para julgar os
          detalhes. “Bastidores” no menu é a minha lista de conferência e as regras de base; não precisa aprovar nada lá.
        </p>
      </section>
    </>
  );
}
