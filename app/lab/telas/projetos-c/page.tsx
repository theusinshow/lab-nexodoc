import { VitrineDeProjetosC } from "./vitrine";

export const metadata = { title: "Projetos C — Laboratório" };

export default function PaginaDeProjetosC() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Direções para comparar</p>
        <h1>Projetos C: linha de produção</h1>
        <p className="lab-lede">
          Toda obra passa pelas mesmas seis etapas até sair do escritório. Aqui cada uma aparece como uma trilha: onde está e o que
          a segura. Clique no nome de uma etapa, como Correções, para ver o gargalo.
        </p>
      </header>
      <VitrineDeProjetosC />
    </>
  );
}
