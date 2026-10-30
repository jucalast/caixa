export type Tipo = "in" | "out";
export type Grupo = "atraso" | "juros" | "cartao" | "familia" | "outro";

export interface Evento {
  id: string;
  date: string; // YYYY-MM-DD
  desc: string;
  tipo: Tipo;
  valor: number;
  cat: string;
  pago: boolean;
  est: boolean; // valor ainda não confirmado
  fixa?: boolean;
  prazo?: string;
  atrasar?: boolean; // deixou atrasar: não abate do caixa
  debt?: string; // id da dívida que este pagamento abate
  cartao?: string; // key do cartão a que a fatura pertence
}

export interface Divida {
  id: string;
  nome: string;
  valor: number;
  grupo: Grupo;
  nota?: string;
  prazo?: string;
  prazoFinal?: string;
  numParcelas?: number;
  valorParcela?: number;
  pendenteInfo?: boolean;
}

export interface Cartao {
  key: string;
  nome: string;
  diaVenc: number;
  faturas: Record<string, number>; // "YYYY-MM" → valor
}

export interface SalarioConfig {
  brutoTotal: number;
  d1: string;
  d2: string;
}

export interface Estado {
  saldoInicial: number;
  saldoDefinido: boolean;
  contarEstimados: boolean;
  events: Evento[];
  debts: Divida[];
  cartoes: Cartao[];
  salarioConfig: SalarioConfig;
  _ts?: number; // última edição (ms) — a versão mais nova vence na sincronização
}

export interface Linha {
  e: Evento;
  before: number;
  after: number;
  on: boolean;
}
