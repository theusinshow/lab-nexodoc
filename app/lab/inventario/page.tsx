import { contarInventario, INVENTARIO } from "@/lib/design-lab/inventario";


export const metadata = { title: "Inventário — Laboratório" };

export default function Inventario() {
  const n = contarInventario();
  return (
    <>
      <header className="lab-cabeca">
        <p className="lab-trilha">Bastidores</p>
        <h1>Inventário</h1>
        <p className="lab-lede">
          Tudo o que o Nexo mostra hoje: <span className="ds-num">{n.telas}</span> telas,{" "}
          <span className="ds-num">{n.situacoes}</span> situações e <span className="ds-num">{n.controles}</span>{" "}
          controles. É a lista que garante que nenhuma tela, caso ou botão fique de fora do redesenho — cada situação daqui
          vira um botão na vitrine da tela.
        </p>
      </header>

      {INVENTARIO.map((grupo) => (
        <section key={grupo.id} className="lab-secao" id={grupo.id}>
          <div className="lab-secao-cabeca">
            <div>
              <h2>{grupo.nome}</h2>
            </div>
          </div>
          <div className="lab-grade">
            {grupo.telas.map((t) => (
              <article key={t.id} className="lab-cartao" style={{ padding: "20px 22px", display: "grid", gap: 18 }}>
                <div className="lab-secao-cabeca" style={{ margin: 0 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h3 style={{ margin: 0, fontSize: "var(--ds-text-lg)", fontWeight: 500, letterSpacing: "-0.015em" }}>{t.nome}</h3>
                      <span className="ds-code">{t.rota}</span>
                    </div>
                    <p style={{ margin: "6px 0 0", color: "var(--ds-text-secondary)", maxWidth: "70ch" }}>{t.trabalho}</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)", gap: 28 }}>
                  <div>
                    <p className="lab-nota" style={{ margin: "0 0 8px" }}>
                      Situações <span className="ds-num">({t.situacoes.length})</span>
                    </p>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}>
                      {t.situacoes.map((s) => (
                        <li
                          key={s.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "180px minmax(0, 1fr)",
                            gap: 14,
                            padding: "7px 10px",
                            borderRadius: "var(--ds-radius-control)",
                            background: "var(--ds-surface-sunken)",
                            fontSize: "var(--ds-text-xs)",
                          }}
                        >
                          <span>{s.nome}</span>
                          <span style={{ color: "var(--ds-text-tertiary)" }}>{s.quando}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="lab-nota" style={{ margin: "0 0 8px" }}>
                      Controles de hoje <span className="ds-num">({t.controles.length})</span>
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {t.controles.map((c) => (
                        <span key={c} className="lab-pilula">
                          {c}
                        </span>
                      ))}
                    </div>
                    <p className="lab-nota" style={{ margin: "16px 0 6px" }}>
                      Onde mora
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {t.fontes.map((f) => (
                        <span key={f} className="ds-code">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
