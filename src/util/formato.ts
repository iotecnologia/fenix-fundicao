// Formatação de números e texto (moeda, kg, %, CNPJ, busca sem acento).

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const moeda = (v: number) => BRL.format(Number.isFinite(v) ? v : 0);

const num = (casas: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const N0 = num(0), N1 = num(1), N2 = num(2), N3 = num(3);
export const n0 = (v: number) => N0.format(v);
export const n1 = (v: number) => N1.format(v);
export const n2 = (v: number) => N2.format(v);
export const n3 = (v: number) => N3.format(v);
/** 12345.6 → "12.346 kg" */
export const kg = (v: number) => `${N0.format(v)} kg`;
/** Peso de peça (com 1 casa): 18.5 → "18,5 kg" */
export const kgP = (v: number) => `${N1.format(v)} kg`;
/** 12345 → "12,3 t" */
export const t = (v: number) => `${N1.format(v / 1000)} t`;
/** 0.734 → "73,4%" */
export const pct = (v: number, casas = 1) => `${num(casas).format(v * 100)}%`;
/** Valor em reais por kg: "R$ 12,48/kg" */
export const rkg = (v: number) => `${moeda(v)}/kg`;

/** Lê número digitado no padrão brasileiro ("1.234,5" → 1234.5). Vazio → NaN. */
export const lerNum = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(/\./g, '').replace(',', '.')));
/** Mostra número no campo de edição ("1234.5" → "1234,5"). */
export const campoNum = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? '' : String(v).replace('.', ','));

export const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const digitos = (s: string) => s.replace(/\D/g, '');

export const iniciais = (nome: string) => {
  const p = nome.split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

export const mascaraCnpj = (s: string) => {
  const d = digitos(s).slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
};

export function cnpjValido(s: string): boolean {
  const d = digitos(s);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = base.split('').reduce((t, c, i) => t + Number(c) * pesos[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(d.slice(0, 12)) === Number(d[12]) && dv(d.slice(0, 13)) === Number(d[13]);
}

export const mascaraTelefone = (s: string) => {
  const d = digitos(s).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

/** Arredonda para n casas (evita 0,1 + 0,2 = 0,30000000000000004). */
export const arred = (v: number, casas = 2) => { const f = 10 ** casas; return Math.round(v * f) / f; };
export const soma = <T,>(l: readonly T[], f: (x: T) => number) => l.reduce((acc, x) => acc + f(x), 0);

/** localStorage protegido: só para conveniência (tema). Nunca para dado do sistema. */
export const local = {
  ler<T>(k: string, p: T): T { try { const v = localStorage.getItem('iofenix:' + k); return v ? (JSON.parse(v) as T) : p; } catch { return p; } },
  gravar(k: string, v: unknown) { try { localStorage.setItem('iofenix:' + k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
};
