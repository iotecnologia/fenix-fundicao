// Ordem de Produção (O.P) — aba "OP (n)" da planilha:
//   peso total  = peso da peça × quantidade (líquido e bruto)
//   refugo      = peças refugadas × peso da peça;  % refugado = refugado ÷ total
// Novo no sistema: as peças fundidas vêm das Fichas do Forno (apontamento de peças por O.P),
// então a O.P mostra sozinha quanto já foi fundido, quanto falta e se está atrasada.
import type { BaseFenix, OrdemProducao } from '../tipos/modelos';
import { arred, soma } from '../util/formato';

export type StatusOP = 'aberta' | 'em_producao' | 'concluida' | 'atrasada';
export const STATUS_OP: Record<StatusOP, { nome: string; cls: string }> = {
  aberta: { nome: 'aguardando', cls: 't-in' },
  em_producao: { nome: 'em produção', cls: 't-at2' },
  concluida: { nome: 'concluída', cls: 't-ok' },
  atrasada: { nome: 'atrasada', cls: 't-no' },
};

export function pesosOP(op: OrdemProducao) {
  const refugadas = soma(op.refugos, (r) => r.quantidade);
  const liqTotal = op.pesoLiquidoKg * op.quantidade, brutoTotal = op.pesoBrutoKg * op.quantidade;
  const liqRef = op.pesoLiquidoKg * refugadas, brutoRef = op.pesoBrutoKg * refugadas;
  return {
    liqTotal: arred(liqTotal, 1), brutoTotal: arred(brutoTotal, 1), refugadas,
    liqRefugado: arred(liqRef, 1), brutoRefugado: arred(brutoRef, 1),
    pctLiqRefugado: liqTotal > 0 ? liqRef / liqTotal : 0,
    pctBrutoRefugado: brutoTotal > 0 ? brutoRef / brutoTotal : 0,
  };
}

/** Peças já fundidas para a O.P (soma dos apontamentos nas fichas do forno). */
export const fundidasOP = (opId: string, base: Pick<BaseFenix, 'fichas'>) =>
  soma(base.fichas, (f) => soma(f.pecas.filter((p) => p.opId === opId), (p) => p.pecas));

export function progressoOP(op: OrdemProducao, base: Pick<BaseFenix, 'fichas'>, hoje: string) {
  const fundidas = fundidasOP(op.id, base);
  const { refugadas } = pesosOP(op);
  const boas = Math.max(0, fundidas - refugadas);
  const faltam = Math.max(0, op.quantidade - boas);
  const status: StatusOP = op.dataEfetiva ? 'concluida' : op.dataPrevista < hoje ? 'atrasada' : fundidas > 0 ? 'em_producao' : 'aberta';
  return { fundidas, boas, faltam, pct: op.quantidade > 0 ? Math.min(1, boas / op.quantidade) : 0, status };
}

/** O.P que podem receber peças numa corrida: não concluídas, da mesma liga. */
export const opsParaCorrida = (base: Pick<BaseFenix, 'ops'>, ligaId: string) =>
  base.ops.filter((o) => !o.dataEfetiva && o.ligaId === ligaId);
