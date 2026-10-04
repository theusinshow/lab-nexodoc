"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaPainel, type SituacaoDoPainel } from "./tela-painel";

const SITUACOES: { id: SituacaoDoPainel; nome: string; dica: string }[] = [
  { id: "com-projetos", nome: "Dia normal", dica: "Como a tela abre todo dia. Troque Meus/Todos e a ordem para ver a lista se reorganizar; abra um projeto pela seta." },
  { id: "linha-aberta", nome: "Projeto aberto", dica: "A linha abre e mostra o achado que está parado, com Nova auditoria. As outras linhas descem suavemente." },
  { id: "nexo-trabalhando", nome: "Nexo trabalhando", dica: "Há uma auditoria rodando: a esfera gira mais rápido, pulsa, e o projeto mostra o progresso." },
  { id: "arrastando", nome: "Soltando um PDF", dica: "Ao arrastar um arquivo para qualquer lugar da tela. Clique para fechar, ou arraste um PDF de verdade para a tela." },
  { id: "primeiro-acesso", nome: "Primeiro acesso", dica: "Ninguém usou ainda: sem projetos, sem atividade. A tela diz o que fazer primeiro." },
  { id: "nada-pendente", nome: "Nada pendente", dica: "Tudo em dia: some o “Precisa da sua atenção” e a esfera diz que nada espera você." },
  { id: "carregando", nome: "Carregando", dica: "Os projetos ainda estão vindo do servidor. O esqueleto tem o formato do que vai chegar." },
  { id: "erro-lista", nome: "Deu erro", dica: "O servidor não respondeu. Clique em Tentar de novo para ver a recuperação." },
  { id: "personalizando", nome: "Personalizando", dica: "A gaveta desliza da direita. Mexa nas chaves; Esc ou Concluir fecham." },
  { id: "foco-rodando", nome: "Foco rodando", dica: "O cronômetro está contando. Pause, zere, troque 25/45/60." },
];

export function VitrineDoPainel() {
  return <Vitrine telaId="painel" situacoes={SITUACOES} render={(s) => <TelaPainel key={s} situacao={s} />} />;
}
