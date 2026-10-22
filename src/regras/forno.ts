// Ficha do Forno (F.F) — mesmas contas da aba "FF (n)" da planilha:
//   carga nominal  = retorno + carga e correção dos insumos metálicos (o fluxo de limpeza não entra)   [K6]
//   carga efetiva  = peso BRUTO das peças fundidas (Σ peso bruto × peças)                              [B47 → R6]
//   peso líquido   = peso LIMPO das peças fundidas (Σ peso líquido × peças)                            [J47]
//   rendimento     = peso líquido ÷ peso bruto da carga                                                [R47]
import type { BaseFenix, Elemento, Faixa, FichaForno, ItemCarga, Liga } from '../tipos/modelos';
import { min } from '../util/datas';
import { arred, soma } from '../util/formato';

export const ELEMENTOS: Elemento[] = ['C', 'Si', 'Mn', 'P', 'S', 'Cu', 'Cr', 'Ni', 'Mg'];

export function cargaNominal(f: FichaForno, base: Pick<BaseFenix, 'insumos'>): number {
  const metalico = (id: string) => base.insumos.find((i) => i.id === id)?.carga === 'metalico';
  return arred(f.retornoKg + soma(f.carga.filter((c) => metalico(c.insumoId)), (c) => c.carga + c.correcao), 1);
}

export function pesosFicha(f: FichaForno, base: Pick<BaseFenix, 'ops'>) {
  let bruto = 0, liquido = 0, pecas = 0;
  for (const p of f.pecas) {
    const op = base.ops.find((o) => o.id === p.opId);
    if (!op) continue;
    bruto += op.pesoBrutoKg * p.pecas;
    liquido += op.pesoLiquidoKg * p.pecas;
    pecas += p.pecas;
  }
  return { bruto: arred(bruto, 1), liquido: arred(liquido, 1), pecas };
}

/** Rendimento metálico da carga (0 a 1). */
export const rendimento = (liquido: number, bruto: number) => (bruto > 0 ? liquido / bruto : 0);

/** Tempo total da corrida em minutos (planilha: Final − Início). */
export const tempoCorrida = (f: FichaForno) => (f.horaInicio && f.horaFim ? min(f.horaFim) - min(f.horaInicio) : 0);

export const dentro = (v: number | undefined, fx?: Faixa) =>
  v === undefined || !fx ? true : (fx.min === undefined || v >= fx.min) && (fx.max === undefined || v <= fx.max);

export interface Conferencia { elemento: Elemento; valor?: number; faixa?: Faixa; ok: boolean }

/** Compara a química encontrada com a especificada pela liga. */
export function conferirQuimica(quimica: FichaForno['quimica'], liga: Liga): Conferencia[] {
  return ELEMENTOS.filter((e) => liga.quimica[e] || quimica[e] !== undefined).map((e) => ({ elemento: e, valor: quimica[e], faixa: liga.quimica[e], ok: dentro(quimica[e], liga.quimica[e]) }));
}

export function situacaoFicha(f: FichaForno, base: Pick<BaseFenix, 'ligas'>) {
  const liga = base.ligas.find((l) => l.id === f.ligaId);
  if (!liga) return { quimicaOk: true, temperaturaOk: true, foraQuimica: [] as Elemento[] };
  const conf = conferirQuimica(f.quimica, liga);
  return { quimicaOk: conf.every((c) => c.ok), temperaturaOk: dentro(f.temperatura, liga.temperatura), foraQuimica: conf.filter((c) => !c.ok).map((c) => c.elemento) };
}

/** Texto da faixa: "3,35 – 3,55", "máx. 0,15", "mín. 180". */
export function textoFaixa(fx?: Faixa, casas = 2): string {
  if (!fx) return '—';
  const f = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  if (fx.min !== undefined && fx.max !== undefined) return `${f(fx.min)} – ${f(fx.max)}`;
  if (fx.max !== undefined) return `máx. ${f(fx.max)}`;
  if (fx.min !== undefined) return `mín. ${f(fx.min)}`;
  return '—';
}

// ---------- carga padrão por tipo de liga (fração da carga nominal) ----------
// Usada para SUGERIR a carga na ficha nova (o forneiro ajusta) e pelo gerador da base fictícia.
export const COMPOSICAO: Record<Liga['tipo'], [string, number][]> = {
  cinzento: [['ifr-0001', 0.40], ['ifr-0002', 0.25], ['ifr-0003', 0.022], ['ifr-0007', 0.012], ['ifr-0010', 0.004], ['ifr-0008', 0.003]],
  nodular: [['ifr-0001', 0.08], ['ifr-0002', 0.50], ['ifr-0003', 0.030], ['ifr-0007', 0.008], ['ifr-0009', 0.015], ['ifr-0008', 0.005]],
  branco: [['ifr-0002', 0.28], ['ifr-0005', 0.38], ['ifr-0011', 0.04], ['ifr-0010', 0.008]],
};
export const RETORNO: Record<Liga['tipo'], number> = { cinzento: 0.30, nodular: 0.35, branco: 0.30 };

/** Carga sugerida para a liga e a carga nominal desejada (o restante fecha na sucata principal). */
export function cargaSugerida(liga: Liga, nominal: number): { retornoKg: number; carga: ItemCarga[] } {
  const retornoKg = Math.round(nominal * RETORNO[liga.tipo]);
  const carga: ItemCarga[] = COMPOSICAO[liga.tipo].map(([insumoId, f]) => ({ insumoId, carga: arred(nominal * f, 1), correcao: 0 }));
  if (liga.id === 'gg25' || liga.id === 'ggg50') carga.push({ insumoId: 'ifr-0006', carga: arred(nominal * 0.005, 1), correcao: 0 });
  const principal = carga[0];
  principal.carga = arred(principal.carga + nominal - retornoKg - soma(carga, (c) => c.carga), 0);
  carga.push({ insumoId: 'ifr-0004', carga: arred(nominal * 0.0015, 1), correcao: 0 });
  return { retornoKg, carga };
}
