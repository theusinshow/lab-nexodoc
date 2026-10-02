/** Sem acento e sem caixa: quem digita "ginasio" acha "Ginásio". */
export const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
