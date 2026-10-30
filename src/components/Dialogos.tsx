"use client";

import { createContext, useContext, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  definirSaldo, excluirDivida, excluirEvento, pagarFatura as acaoPagarFatura, regularizarEmprestimo,
  salvarDivida, salvarEvento, salvarFaturas,
} from "@/lib/actions";
import { ehEmprestimo620, ehFixa, faturaDoMes, mesesDeFatura, restante, valorFatura } from "@/lib/calc";
import { brl, fmtD, hoje, nomeMes } from "@/lib/format";
import { migrar } from "@/lib/migrate";
import { CATS } from "@/lib/seed";
import { useCaixa } from "@/lib/store";
import type { Estado, Evento, Grupo, Tipo } from "@/lib/types";
import { Confirmar, Dialogo, Hero, P, Svg } from "./ui";

type Previa = Partial<Omit<Evento, "id">>;
type Aberto =
  | { k: "evento"; id: string | null; pre?: Previa }
  | { k: "saldo"; obrigatorio: boolean }
  | { k: "fatura"; id: string }
  | { k: "emprestimo" }
  | { k: "cartoes" }
  | { k: "config" }
  | { k: "divida"; id: string | null }
  | { k: "confirmar"; titulo: string; texto: string; rotulo: string; fazer: () => void };

interface Api {
  abrirEvento: (id: string | null, pre?: Previa) => void;
  pagarFatura: (id: string) => void;
  abrirSaldo: () => void;
  abrirEmprestimo: () => void;
  abrirCartoes: () => void;
  abrirConfig: () => void;
  abrirDivida: (id: string | null) => void;
  pagarDivida: (id: string) => void;
}

const Ctx = createContext<Api | null>(null);
export const useDialogos = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDialogos fora do DialogosProvider");
  return c;
};

export function DialogosProvider({ children }: { children: ReactNode }) {
  const { S } = useCaixa();
  const [aberto, setAberto] = useState<Aberto | null>(null);
  // Sem saldo definido, pede o saldo uma vez (sem poder cancelar) — uma conta nova não faz sentido sem ele.
  const [saldoPulado, setSaldoPulado] = useState(false);
  const fechar = () => { setAberto(null); setSaldoPulado(true); };

  const api = useMemo<Api>(() => ({
    abrirEvento: (id, pre) => setAberto({ k: "evento", id, pre }),
    pagarFatura: (id) => setAberto({ k: "fatura", id }),
    abrirSaldo: () => setAberto({ k: "saldo", obrigatorio: false }),
    abrirEmprestimo: () => setAberto({ k: "emprestimo" }),
    abrirCartoes: () => setAberto({ k: "cartoes" }),
    abrirConfig: () => setAberto({ k: "config" }),
    abrirDivida: (id) => setAberto({ k: "divida", id }),
    pagarDivida: (id) => setAberto({ k: "evento", id: null, pre: { debt: id, tipo: "out", cat: "Dívida", pago: true } }),
  }), []);

  const atual: Aberto | null = aberto ?? (!S.saldoDefinido && !saldoPulado ? { k: "saldo", obrigatorio: true } : null);

  return (
    <Ctx.Provider value={api}>
      {children}
      {atual?.k === "evento" && <DlgEvento id={atual.id} pre={atual.pre} fechar={fechar} confirmar={(c) => setAberto({ k: "confirmar", ...c })} />}
      {atual?.k === "saldo" && <DlgSaldo obrigatorio={atual.obrigatorio} fechar={fechar} />}
      {atual?.k === "fatura" && <DlgFatura id={atual.id} fechar={fechar} />}
      {atual?.k === "emprestimo" && <DlgEmprestimo fechar={fechar} />}
      {atual?.k === "cartoes" && <DlgCartoes fechar={fechar} />}
      {atual?.k === "config" && <DlgConfig fechar={fechar} abrirSaldo={api.abrirSaldo} />}
      {atual?.k === "divida" && <DlgDivida id={atual.id} fechar={fechar} confirmar={(c) => setAberto({ k: "confirmar", ...c })} />}
      {atual?.k === "confirmar" && <Confirmar titulo={atual.titulo} texto={atual.texto} rotulo={atual.rotulo} aoConfirmar={atual.fazer} aoFechar={fechar} />}
    </Ctx.Provider>
  );
}

type PedirConfirmacao = (c: { titulo: string; texto: string; rotulo: string; fazer: () => void }) => void;
const num = (v: string) => parseFloat(v.replace(",", "."));

function Acoes({ cancelar, excluir, rotuloOk = "Salvar", fechar }: { cancelar?: string; excluir?: () => void; rotuloOk?: string; fechar: () => void }) {
  return (
    <div className="actions">
      <button className="btn ghost" type="button" onClick={fechar}>{cancelar ?? "Cancelar"}</button>
      {excluir && <button className="btn danger" type="button" onClick={excluir}>Excluir</button>}
      <button className="btn" type="submit">{rotuloOk}</button>
    </div>
  );
}

function Interruptor({ rotulo, marcado, aoMudar, hidden }: { rotulo: string; marcado: boolean; aoMudar: (v: boolean) => void; hidden?: boolean }) {
  if (hidden) return null;
  return <label className="switch"><span>{rotulo}</span><input type="checkbox" checked={marcado} onChange={(e) => aoMudar(e.target.checked)} /></label>;
}

/* ───────── Lançamento ───────── */
function DlgEvento({ id, pre, fechar, confirmar }: { id: string | null; pre?: Previa; fechar: () => void; confirmar: PedirConfirmacao }) {
  const { S, update } = useCaixa();
  const editando = id ? S.events.find((e) => e.id === id) : undefined;
  const inicial = useRef<Previa & { tipo: Tipo }>({
    date: hoje(), desc: "", tipo: "out", valor: 0, cat: "Outros", pago: false, est: false, atrasar: false, debt: "", fixa: false, prazo: "",
    ...(editando ?? {}), ...(editando ? {} : pre),
  }).current;

  const divida = pre?.debt ? S.debts.find((d) => d.id === pre.debt) : undefined;
  const [tipo, setTipo] = useState<Tipo>(inicial.tipo);
  const [valor, setValor] = useState(String(inicial.valor || (divida ? restante(S, divida) : "") || ""));
  const [desc, setDesc] = useState(inicial.desc || (divida ? "Pagamento — " + divida.nome : ""));
  const [data, setData] = useState(inicial.date!);
  const [cat, setCat] = useState(CATS.includes(inicial.cat!) ? inicial.cat! : "Outros");
  const [debt, setDebt] = useState(inicial.debt ?? "");
  const [pago, setPago] = useState(!!inicial.pago);
  const [est, setEst] = useState(!!inicial.est);
  const [fixa, setFixa] = useState(editando ? ehFixa(editando) : !!inicial.fixa);
  const [prazo, setPrazo] = useState(inicial.prazo ?? "");
  const [atrasar, setAtrasar] = useState(!!inicial.atrasar);
  const [repetir, setRepetir] = useState(false);
  const cfg = S.salarioConfig;
  const [gerar13, setGerar13] = useState(true);
  const [bruto, setBruto] = useState(String(cfg.brutoTotal || ""));
  const [d1, setD1] = useState(cfg.d1);
  const [d2, setD2] = useState(cfg.d2);

  const submeter = (ev: FormEvent) => {
    ev.preventDefault();
    const v = Math.abs(num(valor) || 0);
    if (!data || !desc.trim() || !v) return;
    const dados = {
      date: data, desc: desc.trim(), tipo, valor: v, cat, pago, est, fixa,
      prazo: fixa ? prazo.trim() || "Mensal" : "",
      atrasar: tipo === "out" ? atrasar : false,
      debt: tipo === "out" ? debt : "",
      ...(editando?.cartao ? { cartao: editando.cartao } : {}),
    };
    const b = num(bruto) || v * 1.5;
    update(salvarEvento, id, dados, {
      repetirAteFimDoAno: repetir,
      gerar13: cat === "Salário" && gerar13 ? { bruto: b, d1, d2 } : undefined,
    });
    fechar();
  };

  return (
    <Dialogo aoFechar={fechar} id="dlgEv">
      <form className="card" id="evForm" method="dialog" onSubmit={submeter} data-tipo={tipo}>
        <Hero icone={P.plus} titulo={editando ? "Editar lançamento" : "Novo lançamento"} meta="Ao salvar, o calendário e os saldos se atualizam" />
        <div className="body">
          <div className="seg" role="group" aria-label="Tipo">
            <button type="button" className={tipo === "out" ? "on out" : ""} onClick={() => setTipo("out")}>Saída</button>
            <button type="button" className={tipo === "in" ? "on in" : ""} onClick={() => setTipo("in")}>Entrada</button>
          </div>
          <label className="amount"><span className="lbl">Valor</span>
            <span className="amt-in"><b>R$</b>
              <input type="number" step="0.01" min="0" inputMode="decimal" required placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} style={{ width: `calc(${Math.max((valor || "0,00").length, 3)}ch + 4px)` }} />
            </span>
          </label>
          <label className="field"><span className="lbl">O que é</span><input className="input" required placeholder="Ex.: Mercado" value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
          <div className="two">
            <label className="field"><span className="lbl">Data</span><input className="input" type="date" required value={data} onChange={(e) => setData(e.target.value)} /></label>
            <label className="field"><span className="lbl">Categoria</span>
              <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
          </div>

          {cat === "Salário" && (
            <div className="caixa-interna">
              <div className="caixa-interna-t"><Svg d='<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' size={16} sw={2.5} /><span>Cálculo do 13º Salário</span></div>
              <Interruptor rotulo="Calcular 13º com base no salário bruto sem descontos" marcado={gerar13} aoMudar={setGerar13} />
              {gerar13 && (
                <>
                  <label className="field"><span className="lbl">Salário bruto total sem descontos (R$)</span><input className="input" type="number" step="0.01" min="0" placeholder="Ex: 6200.00" value={bruto} onChange={(e) => setBruto(e.target.value)} /></label>
                  <div className="two">
                    <label className="field"><span className="lbl">Data 1ª parcela (50%)</span><input className="input" type="date" value={d1} onChange={(e) => setD1(e.target.value)} /></label>
                    <label className="field"><span className="lbl">Data 2ª parcela (50%)</span><input className="input" type="date" value={d2} onChange={(e) => setD2(e.target.value)} /></label>
                  </div>
                  <span className="hint">Lança 50% em cada parcela no calendário (substitui as parcelas do 13º ainda não recebidas).</span>
                </>
              )}
            </div>
          )}

          <label className="field"><span className="lbl">Abate de qual dívida? (opcional)</span>
            <select className="input" value={debt} onChange={(e) => setDebt(e.target.value)}>
              <option value="">— nenhuma —</option>
              {S.debts.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </label>
          <div className="switch-group">
            <Interruptor rotulo="Conta fixa mensal (recorrente)" marcado={fixa} aoMudar={setFixa} />
            {fixa && (
              <div className="field" style={{ marginTop: 6 }}>
                <span className="lbl">Prazo / Duração da conta fixa (ex: 35 meses)</span>
                <input className="input" placeholder="Ex: 35 meses, 24 parcelas, indeterminado" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
                <span className="hint">Informe o tempo restante deste compromisso</span>
              </div>
            )}
            <Interruptor rotulo={tipo === "in" ? "Já foi recebido" : "Já foi pago"} marcado={pago} aoMudar={setPago} />
            <Interruptor rotulo="Valor ainda não confirmado" marcado={est} aoMudar={setEst} />
            <Interruptor rotulo="Deixar atrasar (não abater agora)" marcado={atrasar} aoMudar={setAtrasar} hidden={tipo !== "out" || pago} />
            <Interruptor rotulo="Repetir todo mês até dezembro" marcado={repetir} aoMudar={setRepetir} hidden={!!editando} />
          </div>
          <Acoes fechar={fechar} excluir={editando ? () => confirmar({
            titulo: "Excluir lançamento?", texto: `“${editando.desc}” sai do calendário.`, rotulo: "Excluir",
            fazer: () => update(excluirEvento, editando.id),
          }) : undefined} />
        </div>
      </form>
    </Dialogo>
  );
}

/* ───────── Saldo ───────── */
function DlgSaldo({ obrigatorio, fechar }: { obrigatorio: boolean; fechar: () => void }) {
  const { S, update } = useCaixa();
  const [v, setV] = useState(S.saldoInicial ? String(S.saldoInicial) : "");
  return (
    <Dialogo aoFechar={obrigatorio ? () => undefined : fechar}>
      <form className="card" method="dialog" onSubmit={(e) => {
        e.preventDefault();
        const n = num(v);
        if (Number.isNaN(n)) return;
        update(definirSaldo, n);
        fechar();
      }}>
        <Hero icone={P.wallet} titulo="Saldo disponível hoje" meta="Ponto de partida de todo o planejamento financeiro" estilo={{ background: "var(--primary-soft)", color: "var(--primary)" }} />
        <div className="body">
          <label className="amount"><span className="lbl">Saldo real disponível em conta</span>
            <span className="amt-in"><b>R$</b><input type="number" step="0.01" inputMode="decimal" required autoFocus placeholder="0,00" value={v} onChange={(e) => setV(e.target.value)} /></span>
          </label>
          <div className="hint" style={{ textAlign: "center", marginTop: 4, fontSize: 12 }}>
            Some o saldo disponível nas contas correntes/poupança. Não inclua limite de cheque especial ou cartão.
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            {!obrigatorio && <button className="btn ghost" type="button" onClick={fechar}>Cancelar</button>}
            <button className="btn" type="submit">Salvar saldo e começar</button>
          </div>
        </div>
      </form>
    </Dialogo>
  );
}

/* ───────── Pagamento de fatura ───────── */
function DlgFatura({ id, fechar }: { id: string; fechar: () => void }) {
  const { S, update } = useCaixa();
  const e = S.events.find((x) => x.id === id);
  const [modo, setModo] = useState<"total" | "parcial">("total");
  const [pago, setPago] = useState("");
  if (!e) return null;
  const quanto = num(pago) || 0;
  const resto = Math.max(0, e.valor - quanto);
  const invalido = modo === "parcial" && (quanto <= 0 || quanto > e.valor);
  return (
    <Dialogo aoFechar={fechar}>
      <form className="card" method="dialog" onSubmit={(ev) => {
        ev.preventDefault();
        if (invalido) return;
        update(acaoPagarFatura, id, modo === "total" ? "total" : quanto);
        fechar();
      }}>
        <Hero icone={P.card} titulo="Pagamento de Fatura" meta="Escolha como deseja pagar esta fatura" estilo={{ background: "var(--ok-bg)", color: "var(--ok)" }} />
        <div className="body">
          <div className="caixa-interna" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <div><small style={{ color: "var(--text-muted)", fontSize: 12, display: "block" }}>Valor total da fatura</small><b style={{ fontSize: 20 }}>{brl(e.valor)}</b></div>
            <span className="chip">{fmtD(e.date)}</span>
          </div>
          <label className="fp-opt">
            <input type="radio" name="modo" checked={modo === "total"} onChange={() => setModo("total")} style={{ marginTop: 3 }} />
            <div className="grow"><b style={{ fontSize: 14 }}>Pagar valor integral</b><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Quita o valor total da fatura neste mês</div></div>
          </label>
          <label className="fp-opt">
            <input type="radio" name="modo" checked={modo === "parcial"} onChange={() => setModo("parcial")} style={{ marginTop: 3 }} />
            <div className="grow">
              <b style={{ fontSize: 14 }}>Pagar valor mínimo ou parcial</b>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>A diferença é transferida automaticamente para a fatura do mês seguinte</div>
              {modo === "parcial" && (
                <div style={{ marginTop: 10 }}>
                  <label className="amount" style={{ padding: 0 }}><span className="lbl" style={{ fontSize: 12 }}>Valor a pagar agora (R$)</span>
                    <span className="amt-in" style={{ fontSize: 28 }}><b style={{ fontSize: 16 }}>R$</b>
                      <input type="number" step="0.01" min="0.01" max={e.valor} autoFocus placeholder="0,00" style={{ fontSize: 28 }} value={pago} onChange={(x) => setPago(x.target.value)} />
                    </span>
                  </label>
                  <div className="sit bad" style={{ marginTop: 10, fontSize: 13, padding: "10px 12px" }}>
                    <b>Restante: {brl(resto)}</b>
                    <span style={{ display: "block", fontSize: 11, opacity: 0.9 }}>será adicionado automaticamente na fatura do próximo mês</span>
                  </div>
                </div>
              )}
            </div>
          </label>
          <div className="actions" style={{ marginTop: 8 }}>
            <button className="btn ghost" type="button" onClick={fechar}>Cancelar</button>
            <button className="btn" type="submit" disabled={invalido}>Confirmar pagamento</button>
          </div>
        </div>
      </form>
    </Dialogo>
  );
}

/* ───────── Empréstimo ───────── */
function DlgEmprestimo({ fechar }: { fechar: () => void }) {
  const { S, update } = useCaixa();
  const emp = S.debts.find(ehEmprestimo620);
  const prox = S.events.filter((e) => e.cat === "Empréstimo" && !e.pago).sort((a, b) => a.date.localeCompare(b.date))[0];
  const [vParc, setVParc] = useState(String(emp?.valorParcela || 620));
  const [n, setN] = useState(String(emp?.numParcelas || 35));
  const [venc, setVenc] = useState(prox?.date ?? hoje());
  const [prazo, setPrazo] = useState(emp?.prazo || `${emp?.numParcelas || 35} meses`);
  return (
    <Dialogo aoFechar={fechar}>
      <form className="card" method="dialog" onSubmit={(ev) => {
        ev.preventDefault();
        const np = parseInt(n) || 0;
        if (np < 1) return;
        update(regularizarEmprestimo, { valorParcela: num(vParc) || 620, numParcelas: np, proxVenc: venc, prazoTxt: prazo.trim() || `${np} meses` });
        fechar();
      }}>
        <Hero icone={P.info} titulo="Empréstimo (Parcela R$ 620)" meta="Defina as parcelas e prazo para a projeção correta" estilo={{ background: "var(--alert-bg)", color: "var(--danger)" }} />
        <div className="body">
          <label className="field"><span className="lbl">Valor da parcela mensal (R$)</span><input className="input" type="number" step="0.01" required value={vParc} onChange={(e) => setVParc(e.target.value)} /></label>
          <div className="two">
            <label className="field"><span className="lbl">Quantas parcelas faltam?</span>
              <input className="input" type="number" min="1" max="120" required value={n} onChange={(e) => { setN(e.target.value); if (+e.target.value > 0) setPrazo(`${e.target.value} meses`); }} />
              <span className="hint">Quantidade de meses</span>
            </label>
            <label className="field"><span className="lbl">Data da próxima parcela</span><input className="input" type="date" required value={venc} onChange={(e) => setVenc(e.target.value)} /></label>
          </div>
          <label className="field"><span className="lbl">Prazo / Duração desta conta fixa</span><input className="input" placeholder="Ex: 35 meses" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></label>
          <Acoes fechar={fechar} rotuloOk="Salvar e regularizar empréstimo" />
        </div>
      </form>
    </Dialogo>
  );
}

/* ───────── Faturas futuras dos cartões ───────── */
function DlgCartoes({ fechar }: { fechar: () => void }) {
  const { S, update } = useCaixa();
  const [m1, m2] = mesesDeFatura(hoje());
  const [v, setV] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const c of S.cartoes) for (const m of [m1, m2]) o[`${c.key}|${m}`] = String(valorFatura(S, c, m) || "");
    return o;
  });
  return (
    <Dialogo aoFechar={fechar}>
      <form className="card" method="dialog" onSubmit={(ev) => {
        ev.preventDefault();
        const valores: Record<string, Record<string, number>> = {};
        for (const [k, txt] of Object.entries(v)) {
          const [key, m] = k.split("|");
          (valores[key] ||= {})[m] = txt === "" ? 0 : num(txt);
        }
        update(salvarFaturas, valores);
        fechar();
      }}>
        <Hero icone={P.card} titulo="Faturas do Cartão" meta="Planejamento das faturas futuras" estilo={{ background: "var(--lav)", color: "var(--on-lav)" }} />
        <div className="body">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {S.cartoes.map((c) => (
              <div key={c.key} className="caixa-interna">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b>{c.nome}</b><span className="chip">Vencimento dia {String(c.diaVenc).padStart(2, "0")}</span></div>
                <div className="two">
                  {[m1, m2].map((m) => (
                    <label key={m} className="field"><span className="lbl">Fatura {nomeMes(m)} (R$)</span>
                      <input className="input" type="number" step="0.01" min="0" placeholder="0,00" value={v[`${c.key}|${m}`]} onChange={(e) => setV({ ...v, [`${c.key}|${m}`]: e.target.value })} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Acoes fechar={fechar} cancelar="Fechar" rotuloOk="Salvar faturas" />
        </div>
      </form>
    </Dialogo>
  );
}

/* ───────── Dívida ───────── */
function DlgDivida({ id, fechar, confirmar }: { id: string | null; fechar: () => void; confirmar: PedirConfirmacao }) {
  const { S, update } = useCaixa();
  const d = id ? S.debts.find((x) => x.id === id) : undefined;
  const [nome, setNome] = useState(d?.nome ?? "");
  const [valor, setValor] = useState(String(d?.valor ?? ""));
  const [grupo, setGrupo] = useState<Grupo>(d?.grupo ?? "outro");
  const [parc, setParc] = useState(String(d?.numParcelas || ""));
  const [prazo, setPrazo] = useState(d?.prazo || d?.prazoFinal || "");
  const [nota, setNota] = useState(d?.nota ?? "");
  return (
    <Dialogo aoFechar={fechar}>
      <form className="card" method="dialog" onSubmit={(ev) => {
        ev.preventDefault();
        update(salvarDivida, id, { nome: nome.trim(), valor: num(valor) || 0, grupo, nota: nota.trim(), prazo: prazo.trim(), numParcelas: parseInt(parc) || 0 });
        fechar();
      }}>
        <Hero icone={P.card} titulo={d ? "Editar dívida" : "Nova dívida"} meta="Saldo devedor inicial" />
        <div className="body">
          <label className="field"><span className="lbl">Nome</span><input className="input" required value={nome} onChange={(e) => setNome(e.target.value)} /></label>
          <div className="two">
            <label className="field"><span className="lbl">Valor inicial (R$)</span><input className="input" type="number" step="0.01" min="0" required value={valor} onChange={(e) => setValor(e.target.value)} /></label>
            <label className="field"><span className="lbl">Grupo</span>
              <select className="input" value={grupo} onChange={(e) => setGrupo(e.target.value as Grupo)}>
                <option value="atraso">Atrasos</option><option value="juros">Com juros</option><option value="cartao">Cartões</option><option value="familia">Família</option><option value="outro">Outras</option>
              </select>
            </label>
          </div>
          <div className="two">
            <label className="field"><span className="lbl">Parcelas restantes (opcional)</span><input className="input" type="number" min="1" placeholder="Ex: 35" value={parc} onChange={(e) => setParc(e.target.value)} /></label>
            <label className="field"><span className="lbl">Prazo / Duração</span><input className="input" placeholder="Ex: 35 meses" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></label>
          </div>
          <label className="field"><span className="lbl">Observação</span><input className="input" placeholder="Opcional" value={nota} onChange={(e) => setNota(e.target.value)} /></label>
          <Acoes fechar={fechar} excluir={d ? () => confirmar({
            titulo: "Excluir esta dívida?", texto: "Os pagamentos ligados a ela ficam no calendário.", rotulo: "Excluir",
            fazer: () => update(excluirDivida, d.id),
          }) : undefined} />
        </div>
      </form>
    </Dialogo>
  );
}

/* ───────── Configurações e backup ───────── */
function DlgConfig({ fechar, abrirSaldo }: { fechar: () => void; abrirSaldo: () => void }) {
  const { S, substituir, toast } = useCaixa();
  const arquivo = useRef<HTMLInputElement>(null);

  const baixar = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: "application/json" }));
    a.download = `caixa-backup-${hoje()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const restaurar = async (f: File) => {
    try {
      const j = JSON.parse(await f.text()) as Partial<Estado>;
      if (!Array.isArray(j.events) || !Array.isArray(j.debts)) throw new Error("formato");
      substituir(migrar(j));
      toast("Backup restaurado");
      fechar();
    } catch { toast("Arquivo inválido"); }
  };

  return (
    <Dialogo aoFechar={fechar}>
      <div className="card">
        <Hero icone={P.gear} titulo="Configurações" meta="Dados e saldo inicial" />
        <div className="body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="caixa-interna" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <div><b>Saldo inicial em conta</b><small style={{ display: "block", color: "var(--text-muted)", fontSize: 13 }}>{brl(S.saldoInicial)}</small></div>
            <button className="btn sm" type="button" onClick={abrirSaldo}>Alterar</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="lbl">Backup</span>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              <button className="btn sm ghost" type="button" onClick={baixar}>Baixar backup</button>
              <button className="btn sm ghost" type="button" onClick={() => arquivo.current?.click()}>Restaurar backup</button>
              <input ref={arquivo} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) restaurar(f); e.target.value = ""; }} />
            </div>
          </div>
          <div className="actions" style={{ marginTop: 8 }}><button className="btn" type="button" onClick={fechar}>Fechar</button></div>
        </div>
      </div>
    </Dialogo>
  );
}

export { faturaDoMes };
