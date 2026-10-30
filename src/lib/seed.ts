import type { Cartao, Divida, Estado, Evento } from "./types";

export const CATS = ["Salário","Aluguel recebido","13º","Moradia","Financiamento","Faculdade","Transporte","Casa","Empréstimo","Cartão","Dívida","Família","Alimentação","Lazer","Outros"];
export const GRUPOS: Record<string, string> = {
  atraso: "Atrasadas — pagar primeiro",
  juros: "Cheque especial — juros todo dia",
  cartao: "Faturas para parcelar",
  familia: "Sem prazo — com calma",
  outro: "Outras",
};
export const ID_EMPRESTIMO = "d_emp620";

export const cartoesPadrao = (): Cartao[] => [
  { key: "nubank", nome: "Nubank", diaVenc: 9, faturas: { "2026-11": 1300, "2026-12": 0 } },
  { key: "caixa", nome: "Cartão Caixa", diaVenc: 20, faturas: { "2026-11": 900, "2026-12": 0 } },
  { key: "giovana", nome: "Cartão da Giovana", diaVenc: 13, faturas: { "2026-11": 3000, "2026-12": 0 } },
];

export const emprestimoPadrao = (): Divida => ({
  id: ID_EMPRESTIMO, nome: "Empréstimo (Parcela R$ 620)", valor: 21700, grupo: "outro",
  nota: "35 parcelas de R$ 620 · Prazo: 35 meses", pendenteInfo: false,
  numParcelas: 35, valorParcela: 620, prazo: "35 meses", prazoFinal: "2029-09-30",
});

/** Planejamento inicial de uma conta nova (os números reais de João e Giovana). */
export function seed(): Estado {
  let n = 0;
  const events: Evento[] = [];
  const add = (date: string, desc: string, tipo: "in" | "out", valor: number, cat: string, o: Partial<Evento> = {}) =>
    events.push({ id: "e" + ++n, date, desc, tipo, valor, cat, pago: false, est: false, debt: "", fixa: true, ...o });

  add("2026-10-30", "Salários (60%)", "in", 3720, "Salário", { prazo: "Mensal" });
  add("2026-10-30", "Clínica do irmão (pontual)", "out", 1000, "Família", { fixa: false });
  add("2026-10-30", "Parcela do empréstimo", "out", 620, "Empréstimo", { debt: ID_EMPRESTIMO, prazo: "35 meses" });
  for (const m of ["11", "12"]) {
    const p = (d: string) => `2026-${m}-${d}`;
    add(p("01"), "Transporte", "out", 200, "Transporte", { prazo: "Mensal" });
    add(p("01"), "Contas domésticas", "out", 150, "Casa", { prazo: "Mensal" });
    add(p("06"), "Faculdade", "out", 1200, "Faculdade", { prazo: "24 meses" });
    add(p("10"), "Financiamento Indaiatuba", "out", 1900, "Financiamento", { prazo: "360 meses" });
    add(p("10"), "Condomínio Indaiatuba", "out", 550, "Moradia", { prazo: "Mensal" });
    add(p("10"), "Energia elétrica", "out", 100, "Moradia", { prazo: "Mensal" });
    add(p("10"), "Parcela apto SP (R$ 500)", "out", 500, "Financiamento", { prazo: "35 meses" });
    add(p("12"), "Aluguel apto SP", "in", 1000, "Aluguel recebido", { prazo: "30 meses" });
    add(p("15"), "Salários (40%)", "in", 2480, "Salário", { prazo: "Mensal" });
    add(p("23"), "Parcela principal apto SP", "out", 1300, "Financiamento", { prazo: "35 meses" });
    add(p("30"), "Salários (60%)", "in", 3720, "Salário", { prazo: "Mensal" });
    add(p("30"), "Parcela do empréstimo", "out", 620, "Empréstimo", { debt: ID_EMPRESTIMO, prazo: "35 meses" });
  }
  add("2026-11-20", "Fatura cartão Caixa", "out", 900, "Cartão", { fixa: false, cartao: "caixa" });
  add("2026-11-20", "Próxima parcela da entrada do apto", "out", 800, "Financiamento", { prazo: "1 parcela" });
  add("2026-11-20", "13º salário — 1ª parcela (50% bruto)", "in", 3100, "13º", { fixa: false });
  add("2026-11-30", "Condomínio atrasado Indaiatuba", "out", 1689, "Dívida", { debt: "d1", fixa: false });
  add("2026-11-30", "Parcela atrasada da entrada do apto", "out", 1163, "Dívida", { debt: "d2", fixa: false });
  add("2026-12-15", "Acordo dos cartões — parcela (estimada)", "out", 450, "Cartão", { est: true, debt: "d6", fixa: false });
  add("2026-12-20", "13º salário — 2ª parcela (50% bruto)", "in", 3100, "13º", { fixa: false });

  return {
    saldoInicial: 0,
    saldoDefinido: false,
    contarEstimados: false,
    events,
    debts: [
      { id: "d1", nome: "Condomínio atrasado — Indaiatuba", valor: 1689, grupo: "atraso", nota: "Não confundir com o condomínio mensal de R$ 550." },
      { id: "d2", nome: "Parcela atrasada da entrada do apto", valor: 1163, grupo: "atraso", nota: "Separada da parcela de R$ 800 (20/11)." },
      { id: "d3", nome: "Cheque especial — Caixa", valor: 2000, grupo: "juros", nota: "Quitar direto, sem renegociar." },
      { id: "d4", nome: "Cheque especial — Santander", valor: 4000, grupo: "juros", nota: "≈ R$ 1.500 seus e ≈ R$ 2.500 da Giovana." },
      { id: "d5", nome: "Fatura Nubank (parcelar)", valor: 1300, grupo: "cartao", nota: "Venc. dia 9. Ligar no banco e parcelar antes do vencimento." },
      { id: "d6", nome: "Fatura cartão da Giovana (parcelar)", valor: 3000, grupo: "cartao", nota: "Venc. dia 13. Limite totalmente comprometido." },
      { id: "d7", nome: "Sogro", valor: 20000, grupo: "familia", nota: "Sem prazo e sem parcela acordada. Formalizar depois de estabilizar." },
      emprestimoPadrao(),
    ],
    cartoes: cartoesPadrao(),
    salarioConfig: { brutoTotal: 6200, d1: "2026-11-20", d2: "2026-12-20" },
  };
}
