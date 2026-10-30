import { ehEmprestimo620 } from "./migrate";
import { faturaDoMes } from "./calc";
import { brl0, nomeMes, somaMeses, uid } from "./format";
import type { Divida, Estado, Evento } from "./types";

/**
 * Operações sobre o estado. Cada uma recebe um rascunho já clonado (ver `update` no store),
 * então podem mutar à vontade; devolvem o aviso a mostrar ao usuário, quando há.
 */
export type Mutacao<A extends unknown[] = []> = (s: Estado, ...args: A) => string | void;

export const alternarPago: Mutacao<[string]> = (s, id) => {
  const e = s.events.find((x) => x.id === id);
  if (e) e.pago = !e.pago;
};

export const alternarAtrasar: Mutacao<[string]> = (s, id) => {
  const e = s.events.find((x) => x.id === id);
  if (!e) return;
  e.atrasar = !e.atrasar;
  return e.atrasar ? `"${e.desc}" marcada para atrasar. Saldo liberado!` : `"${e.desc}" reincluída no caixa.`;
};

export const definirSaldo: Mutacao<[number]> = (s, valor) => {
  s.saldoInicial = valor;
  s.saldoDefinido = true;
};

export const definirContarEstimados: Mutacao<[boolean]> = (s, v) => {
  s.contarEstimados = v;
};

export interface DadosEvento extends Omit<Evento, "id"> {}
export interface OpcoesEvento {
  repetirAteFimDoAno?: boolean;
  gerar13?: { bruto: number; d1: string; d2: string };
}

/** Cria (`id` nulo) ou atualiza um lançamento. Pode repetir mensalmente até dezembro e gerar as duas parcelas do 13º. */
export const salvarEvento: Mutacao<[string | null, DadosEvento, OpcoesEvento]> = (s, id, dados, op) => {
  if (op.gerar13 && dados.cat === "Salário" && op.gerar13.bruto > 0) {
    const { bruto, d1, d2 } = op.gerar13;
    const p1 = Math.round((bruto / 2) * 100) / 100;
    s.events = s.events.filter((x) => !(x.cat === "13º" && !x.pago));
    s.events.push(
      { id: uid(), date: d1, desc: "13º salário — 1ª parcela (50% bruto)", tipo: "in", valor: p1, cat: "13º", pago: false, est: false, fixa: false },
      { id: uid(), date: d2, desc: "13º salário — 2ª parcela (50% bruto)", tipo: "in", valor: Math.round((bruto - p1) * 100) / 100, cat: "13º", pago: false, est: false, fixa: false },
    );
    s.salarioConfig = { brutoTotal: bruto, d1, d2 };
  }
  const atual = id ? s.events.find((x) => x.id === id) : undefined;
  if (atual) { Object.assign(atual, dados); return "Salvo"; }

  s.events.push({ id: uid(), ...dados });
  if (op.repetirAteFimDoAno) {
    const ano = dados.date.slice(0, 4);
    for (let n = 1; ; n++) {
      const date = somaMeses(dados.date, n);
      if (!date.startsWith(ano)) break;
      s.events.push({ id: uid(), ...dados, pago: false, date });
    }
  }
  return "Salvo";
};

export const excluirEvento: Mutacao<[string]> = (s, id) => {
  s.events = s.events.filter((e) => e.id !== id);
  return "Lançamento excluído";
};

/**
 * Paga uma fatura. No pagamento parcial, o valor da fatura vira o que foi pago e a diferença
 * é somada à fatura em aberto do mês seguinte (ou cria uma nova).
 */
export const pagarFatura: Mutacao<[string, number | "total"]> = (s, id, quanto) => {
  const e = s.events.find((x) => x.id === id);
  if (!e) return;
  if (quanto === "total" || quanto >= e.valor) { e.pago = true; return "Fatura quitada!"; }

  const resto = e.valor - quanto;
  e.valor = quanto;
  e.pago = true;
  if (!/parcial/i.test(e.desc)) e.desc += " (pagto parcial)";

  const proxData = somaMeses(e.date, 1);
  const proxMes = proxData.slice(0, 7);
  // Em dados antigos a fatura não guarda a chave do cartão: descobre pelo nome.
  const cartao = s.cartoes.find((c) => (e.cartao ? c.key === e.cartao : e.desc.toLowerCase().includes(c.nome.toLowerCase())));
  const proxima = s.events.find(
    (x) => x.cat === "Cartão" && !x.pago && x.date.startsWith(proxMes) && (cartao ? faturaDoMes(s, cartao, proxMes)?.id === x.id : true),
  );
  const nome = nomeMes(proxMes);
  if (proxima) {
    proxima.valor += resto;
    proxima.desc += ` (+ ${brl0(resto)} residual)`;
  } else {
    s.events.push({
      id: uid(), date: proxData, tipo: "out", valor: resto, cat: "Cartão", pago: false, est: false, fixa: false, cartao: cartao?.key ?? e.cartao,
      desc: `Fatura ${nome} (${e.desc.replace(/ \(pagto parcial\)/i, "")} + ${brl0(resto)} residual)`,
    });
  }
  return `Pago ${brl0(quanto)}. ${brl0(resto)} foi para a fatura de ${nome}!`;
};

/** Ajusta (ou cria) as faturas de cada cartão nos meses informados: `valores[chaveDoCartao][YYYY-MM]`. */
export const salvarFaturas: Mutacao<[Record<string, Record<string, number>>]> = (s, valores) => {
  for (const c of s.cartoes) {
    const doCartao = valores[c.key] ?? {};
    c.faturas ||= {};
    for (const [ym, v] of Object.entries(doCartao)) {
      if (Number.isNaN(v)) continue;
      c.faturas[ym] = v;
      const ev = faturaDoMes(s, c, ym);
      if (ev) ev.valor = v;
      else if (v > 0) {
        const dia = String(c.diaVenc).padStart(2, "0");
        s.events.push({ id: uid(), date: `${ym}-${dia}`, desc: `Fatura ${nomeMes(ym).toLowerCase().slice(0, 3)} — ${c.nome}`, tipo: "out", valor: v, cat: "Cartão", pago: false, est: false, fixa: false, cartao: c.key });
      }
    }
  }
  return "Faturas atualizadas!";
};

export type DadosDivida = Pick<Divida, "nome" | "valor" | "grupo" | "nota" | "prazo" | "numParcelas">;

export const salvarDivida: Mutacao<[string | null, DadosDivida]> = (s, id, dados) => {
  const d = id ? s.debts.find((x) => x.id === id) : undefined;
  if (d) {
    Object.assign(d, dados);
    if (ehEmprestimo620(d)) d.pendenteInfo = false;
  } else s.debts.push({ id: uid(), pendenteInfo: false, ...dados });
};

export const excluirDivida: Mutacao<[string]> = (s, id) => {
  s.events.forEach((e) => { if (e.debt === id) e.debt = ""; });
  s.debts = s.debts.filter((d) => d.id !== id);
};

/** Cadastra o empréstimo de parcela fixa e (re)gera as parcelas em aberto no calendário. */
export const regularizarEmprestimo: Mutacao<[{ valorParcela: number; numParcelas: number; proxVenc: string; prazoTxt: string }]> = (s, f) => {
  const { valorParcela, numParcelas, proxVenc, prazoTxt } = f;
  const dia = Number(proxVenc.slice(8, 10));
  const prazoFinal = somaMeses(proxVenc, numParcelas - 1, Math.min(dia, 28));
  const nota = `${numParcelas} parcelas de ${brl0(valorParcela)} · Prazo: ${prazoTxt}`;

  let emp = s.debts.find(ehEmprestimo620);
  if (!emp) { emp = { id: "d_emp620", nome: "Empréstimo (Parcela R$ 620)", valor: 0, grupo: "outro" }; s.debts.push(emp); }
  Object.assign(emp, { valorParcela, numParcelas, prazo: prazoTxt, prazoFinal, valor: valorParcela * numParcelas, pendenteInfo: false, nota });

  s.events = s.events.filter((e) => !(e.cat === "Empréstimo" && !e.pago));
  for (let i = 0; i < Math.min(numParcelas, 60); i++) {
    s.events.push({
      id: uid(), date: somaMeses(proxVenc, i, dia), desc: `Parcela empréstimo (${i + 1}/${numParcelas})`, tipo: "out",
      valor: valorParcela, cat: "Empréstimo", pago: false, est: false, debt: emp.id, fixa: true, prazo: prazoTxt,
    });
  }
  return "Empréstimo regularizado com sucesso!";
};
