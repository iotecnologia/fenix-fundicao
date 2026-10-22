import { describe, expect, it } from 'vitest';
import { gerarBase } from '../src/repositorio/gerador';
import { custoMes } from '../src/regras/custo';
import { cargaNominal, pesosFicha } from '../src/regras/forno';
import { saldo } from '../src/regras/insumos';
import { progressoOP } from '../src/regras/producao';

const HOJE = '2026-10-21';
const b = gerarBase(HOJE);

describe('base fictícia', () => {
  it('é previsível (mesma data → mesma base)', () => {
    const c = gerarBase(HOJE);
    expect(c.fichas.length).toBe(b.fichas.length);
    expect(c.movimentos.length).toBe(b.movimentos.length);
  });
  it('números de documento únicos por tipo', () => {
    for (const l of [b.orcamentos, b.ops, b.fichas, b.rncs, b.certificados]) expect(new Set(l.map((x) => x.numero)).size).toBe(l.length);
  });
  it('nenhum estoque negativo', () => {
    for (const i of b.insumos) expect(saldo(i.id, b.movimentos)).toBeGreaterThanOrEqual(0);
  });
  it('a carga efetiva nunca passa da carga nominal nem da capacidade do forno', () => {
    for (const f of b.fichas) {
      const forno = b.fornos.find((x) => x.id === f.fornoId)!;
      const nom = cargaNominal(f, b), p = pesosFicha(f, b);
      expect(p.bruto).toBeLessThanOrEqual(nom);
      expect(nom).toBeLessThanOrEqual(forno.capacidadeKg * 1.02);
      expect(p.liquido).toBeLessThan(p.bruto);
    }
  });
  it('O.P concluída tem todas as peças boas fundidas', () => {
    for (const o of b.ops.filter((x) => x.dataEfetiva)) expect(progressoOP(o, b, HOJE).faltam).toBe(0);
  });
  it('nada no futuro', () => {
    for (const l of [b.fichas, b.rncs, b.faturamento, b.certificados, b.movimentos]) expect(l.every((x) => x.data <= HOJE)).toBe(true);
  });
  it('certificado aponta para uma corrida que fundiu a peça', () => {
    for (const c of b.certificados) expect(b.fichas.some((f) => f.id === c.fichaId)).toBe(true);
  });
  it('custo por kg do último mês fechado em faixa de fundição (R$ 8 a R$ 16)', () => {
    const c = custoMes(b, '2026-09');
    expect(c.custoKg).toBeGreaterThan(8); expect(c.custoKg).toBeLessThan(16);
    expect(c.rendimento).toBeGreaterThan(0.6); expect(c.rendimento).toBeLessThan(0.8);
  });
  it('a apresentação tem o que mostrar: O.P em produção, atrasadas e insumo abaixo do mínimo', () => {
    const st = b.ops.map((o) => progressoOP(o, b, HOJE).status);
    expect(st).toContain('em_producao'); expect(st).toContain('atrasada');
    expect(b.insumos.some((i) => saldo(i.id, b.movimentos) < i.estoqueMinimo)).toBe(true);
  });
});
