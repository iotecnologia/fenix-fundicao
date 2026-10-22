// Orçamento — abas "GERAÇÃO DE ORÇAMENTO" e "ORÇAMENTO (n)" da planilha, POR KG:
//   imposto R$/kg   = preço × imposto %                  [K]
//   comissão R$/kg  = preço × comissão %                 [M]
//   lucro R$/kg     = preço − (imposto + comissão + custo por kg fabricado)   [L = G − (K + M + L4)]
//   margem %        = lucro ÷ preço                      [J]
//   valor do item   = preço/kg × peso × quantidade       [J17…J31]
// Correção: na planilha, 150 das 200 abas de orçamento tinham o item 004 apontando para L14 (vazio)
// e o item 015 com o preço fixo 14 — aqui todos os itens usam o mesmo preço/kg.
import type { Orcamento } from '../tipos/modelos';
import { arred, soma } from '../util/formato';

export interface ParamPreco { precoKg: number; impostoPct: number; comissaoPct: number; custoKgRef: number }

export function margemKg({ precoKg, impostoPct, comissaoPct, custoKgRef }: ParamPreco) {
  const imposto = (precoKg * impostoPct) / 100;
  const comissao = (precoKg * comissaoPct) / 100;
  const lucro = precoKg - (imposto + comissao + custoKgRef);
  return { imposto: arred(imposto), comissao: arred(comissao), lucro: arred(lucro), margem: precoKg > 0 ? lucro / precoKg : 0 };
}

export function totaisOrcamento(o: Pick<Orcamento, 'itens' | 'precoKg' | 'impostoPct' | 'comissaoPct' | 'custoKgRef'>) {
  const pesoTotal = soma(o.itens, (i) => i.pesoKg * i.quantidade);
  const valor = soma(o.itens, (i) => o.precoKg * i.pesoKg * i.quantidade);
  const m = margemKg(o);
  return {
    pesoTotal: arred(pesoTotal, 1), valor: arred(valor), pecas: soma(o.itens, (i) => i.quantidade),
    imposto: arred(m.imposto * pesoTotal), comissao: arred(m.comissao * pesoTotal), lucro: arred(m.lucro * pesoTotal), margem: m.margem,
  };
}

/** Preço por kg para atingir uma margem desejada (o comercial digita a margem e o sistema acha o preço). */
export function precoParaMargem(margemAlvo: number, impostoPct: number, comissaoPct: number, custoKgRef: number): number {
  const div = 1 - impostoPct / 100 - comissaoPct / 100 - margemAlvo;
  return div > 0 ? arred(custoKgRef / div) : 0;
}

export const STATUS_ORC: Record<Orcamento['status'], { nome: string; cls: string }> = {
  aberto: { nome: 'em aberto', cls: 't-at' },
  aprovado: { nome: 'aprovado', cls: 't-ok' },
  perdido: { nome: 'não aprovado', cls: 't-fim' },
};
