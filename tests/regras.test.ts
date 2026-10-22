import { describe, expect, it } from 'vitest';
import { margemKg, precoParaMargem, totaisOrcamento } from '../src/regras/orcamento';
import { cargaNominal, conferirQuimica, pesosFicha, rendimento } from '../src/regras/forno';
import { pesosOP, progressoOP } from '../src/regras/producao';
import { resumoMes, saldo } from '../src/regras/insumos';
import { pesoRnc } from '../src/regras/qualidade';
import { prefixoMes, proximoNumero, somaMes, fimDoMes } from '../src/regras/periodo';
import type { FichaForno, Insumo, MovInsumo, OrdemProducao } from '../src/tipos/modelos';
import ligas from '../src/dados/ligas.json';

describe('numeração (igual à planilha: MM.AA-NNN)', () => {
  it('prefixo do mês', () => expect(prefixoMes('2026-10-21')).toBe('10.26'));
  it('próximo número reinicia a cada mês', () => {
    const l = [{ numero: '10.26-001' }, { numero: '10.26-002' }, { numero: '09.26-040' }];
    expect(proximoNumero(l, '2026-10-30')).toBe('10.26-003');
    expect(proximoNumero(l, '2026-11-02')).toBe('11.26-001');
    expect(proximoNumero([], '2026-10-01', 4)).toBe('10.26-0001');
  });
  it('meses', () => { expect(somaMes('2026-01', -1)).toBe('2025-12'); expect(fimDoMes('2026-02')).toBe('2026-02-28'); });
});

describe('orçamento (planilha GERAÇÃO DE ORÇAMENTO)', () => {
  it('margem por kg = preço − imposto − comissão − custo/kg', () => {
    const m = margemKg({ precoKg: 20, impostoPct: 10, comissaoPct: 2, custoKgRef: 11 });
    expect(m.imposto).toBe(2); expect(m.comissao).toBe(0.4); expect(m.lucro).toBe(6.6); expect(m.margem).toBeCloseTo(0.33);
  });
  it('todos os itens usam o mesmo preço/kg (corrige o item 004 e 015 da planilha)', () => {
    const t = totaisOrcamento({ precoKg: 20, impostoPct: 0, comissaoPct: 0, custoKgRef: 0, itens: Array.from({ length: 15 }, () => ({ identificacao: 'x', pesoKg: 2, quantidade: 3 })) });
    expect(t.valor).toBe(15 * 20 * 2 * 3);
  });
  it('preço para uma margem desejada fecha a conta', () => {
    const p = precoParaMargem(0.3, 10, 2, 11);
    expect(margemKg({ precoKg: p, impostoPct: 10, comissaoPct: 2, custoKgRef: 11 }).margem).toBeCloseTo(0.3, 2);
  });
});

const insumos: Insumo[] = [
  { id: 'a', codigo: 'IFR-0001', grupo: 'IFR', nome: 'Sucata', unidade: 'kg', preco: 2, estoqueMinimo: 10, carga: 'metalico' },
  { id: 'f', codigo: 'IFR-0004', grupo: 'IFR', nome: 'Fluxo', unidade: 'kg', preco: 9, estoqueMinimo: 1, carga: 'auxiliar' },
];
const op: OrdemProducao = { id: 'op1', numero: '10.26-001', data: '2026-10-01', clienteId: 'c', desenho: 'D', ligaId: 'gg20', quantidade: 10, pesoLiquidoKg: 7, pesoBrutoKg: 10, dataPrevista: '2026-10-20', refugos: [{ data: '2026-10-05', quantidade: 2, causa: 'x' }] };
const ff: FichaForno = { id: 'ff1', numero: '10.26-001', data: '2026-10-04', ligaId: 'gg20', fornoId: 'f1', posicao: 1, usoRefratario: 3, retornoKg: 100, carga: [{ insumoId: 'a', carga: 300, correcao: 5 }, { insumoId: 'f', carga: 1, correcao: 0 }], quimica: { C: 3.4, Si: 2.5 }, horaInicio: '07:00', horaFim: '08:20', temperatura: 1400, pecas: [{ opId: 'op1', pecas: 8 }], visto: '' };

describe('ficha do forno (planilha FF)', () => {
  it('carga nominal = retorno + metálicos (sem o fluxo)', () => expect(cargaNominal(ff, { insumos })).toBe(405));
  it('carga efetiva e peso líquido vêm das peças fundidas', () => {
    const p = pesosFicha(ff, { ops: [op] });
    expect(p.bruto).toBe(80); expect(p.liquido).toBe(56); expect(rendimento(p.liquido, p.bruto)).toBeCloseTo(0.7);
  });
  it('confere a química contra a liga', () => {
    const c = conferirQuimica(ff.quimica, ligas.find((l) => l.id === 'gg20') as never);
    expect(c.find((x) => x.elemento === 'C')?.ok).toBe(true);
    expect(c.find((x) => x.elemento === 'Si')?.ok).toBe(false); // 2,5 > 2,20
  });
});

describe('ordem de produção (planilha OP)', () => {
  it('pesos e % de refugo', () => {
    const p = pesosOP(op);
    expect(p.liqTotal).toBe(70); expect(p.brutoRefugado).toBe(20); expect(p.pctBrutoRefugado).toBeCloseTo(0.2);
  });
  it('progresso usa as peças apontadas nas fichas, menos o refugo', () => {
    const p = progressoOP(op, { fichas: [ff] }, '2026-10-10');
    expect(p.fundidas).toBe(8); expect(p.boas).toBe(6); expect(p.faltam).toBe(4); expect(p.status).toBe('em_producao');
    expect(progressoOP(op, { fichas: [ff] }, '2026-10-25').status).toBe('atrasada');
  });
});

describe('insumos (planilha I.R.F / CONSUMO)', () => {
  const movs: MovInsumo[] = [
    { id: '1', insumoId: 'a', data: '2026-09-30', tipo: 'saldo_inicial', quantidade: 100, valorUnit: 2 },
    { id: '2', insumoId: 'a', data: '2026-10-02', tipo: 'compra', quantidade: 50, valorUnit: 2.1 },
    { id: '3', insumoId: 'a', data: '2026-10-03', tipo: 'retirada', quantidade: 30, valorUnit: 2 },
  ];
  it('estoque = sobra anterior + compras − retiradas', () => expect(saldo('a', movs)).toBe(120));
  it('resumo do mês', () => {
    const r = resumoMes(insumos[0], movs, '2026-10');
    expect(r.utilizado).toBe(30); expect(r.gastoUtilizado).toBe(60); expect(r.comprado).toBe(50); expect(r.gastoCompra).toBe(105);
  });
});

it('RNC: peso perdido = peças × peso bruto unitário', () => expect(pesoRnc({ quantidade: 3, pesoUnitKg: 12.5 })).toBe(37.5));
