// Insumos — abas "CONSUMO DE …" e "I.R.F (n)", "I.M.F (n)", "E.P.I (n)", "I.E.L (n)" da planilha:
//   estoque = compras do mês − retiradas do mês + sobra do mês anterior   [L8 = G8 − B8 + L4]
// No sistema o estoque é contínuo (não precisa digitar a sobra do mês anterior) e cada insumo tem a sua unidade
// (a planilha usava "Kg" para tudo, até para luva e sapato).
// As retiradas dos insumos de carga são lançadas sozinhas quando a Ficha do Forno é gravada.
import type { BaseFenix, GrupoInsumo, Insumo, MovInsumo } from '../tipos/modelos';
import { arred, soma } from '../util/formato';
import { noMes } from './periodo';

export const GRUPOS_INSUMO: Record<GrupoInsumo, { nome: string; curto: string }> = {
  IFR: { nome: 'Fusão e Rebarbação', curto: 'Fusão' },
  IMF: { nome: 'Moldagem e Fechamento', curto: 'Moldagem' },
  EPI: { nome: 'Equipamento de Proteção Individual', curto: 'EPI' },
  IEL: { nome: 'Escritório e Limpeza', curto: 'Escritório' },
};

const sinal = (m: MovInsumo) => (m.tipo === 'retirada' ? -1 : 1);

/** Saldo em estoque até a data (inclusive). */
export const saldo = (insumoId: string, movs: readonly MovInsumo[], ate?: string) =>
  arred(soma(movs.filter((m) => m.insumoId === insumoId && (!ate || m.data <= ate)), (m) => sinal(m) * m.quantidade), 3);

export function resumoMes(insumo: Insumo, movs: readonly MovInsumo[], mes: string) {
  const doMes = movs.filter((m) => m.insumoId === insumo.id && noMes(m.data, mes));
  const ret = doMes.filter((m) => m.tipo === 'retirada'), comp = doMes.filter((m) => m.tipo === 'compra');
  return {
    utilizado: arred(soma(ret, (m) => m.quantidade), 3),
    gastoUtilizado: arred(soma(ret, (m) => m.quantidade * m.valorUnit)),
    comprado: arred(soma(comp, (m) => m.quantidade), 3),
    gastoCompra: arred(soma(comp, (m) => m.quantidade * m.valorUnit)),
  };
}

export type SituacaoEstoque = 'ok' | 'baixo' | 'zerado';
export const situacaoEstoque = (i: Insumo, s: number): SituacaoEstoque => (s <= 0 ? 'zerado' : s < i.estoqueMinimo ? 'baixo' : 'ok');

/** Gasto do mês com os insumos de um grupo (planilha CUSTO MENSAL: soma da coluna "Gasto Mensal Utilizado"). */
export const gastoGrupoMes = (base: Pick<BaseFenix, 'insumos' | 'movimentos'>, grupo: GrupoInsumo, mes: string) =>
  arred(soma(base.insumos.filter((i) => i.grupo === grupo), (i) => resumoMes(i, base.movimentos, mes).gastoUtilizado));

export function abaixoDoMinimo(base: Pick<BaseFenix, 'insumos' | 'movimentos'>) {
  return base.insumos.map((i) => ({ i, s: saldo(i.id, base.movimentos) })).filter(({ i, s }) => situacaoEstoque(i, s) !== 'ok');
}
