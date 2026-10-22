// Qualidade — RNC (abas "GERAÇÃO DE R.N.C" e "RNC (n)") e Certificado de Qualidade ("CQ (n)").
//   RNC: peso total perdido = peças perdidas × peso bruto unitário   [I = G × H]
//   CQ:  a química encontrada vem da ficha do forno da corrida (antes era digitada de novo no certificado)
//        e é conferida contra a norma da liga; a mecânica é conferida contra a especificação da liga.
import type { BaseFenix, Certificado, Mecanica, Rnc } from '../tipos/modelos';
import { arred } from '../util/formato';
import { conferirQuimica, dentro } from './forno';

export const pesoRnc = (r: Pick<Rnc, 'quantidade' | 'pesoUnitKg'>) => arred(r.quantidade * r.pesoUnitKg, 1);

export const MOTIVOS_RNC = ['Porosidade / bolha de gás', 'Inclusão de areia', 'Trinca a quente', 'Rechupe', 'Falha de enchimento (peça incompleta)', 'Junta fria', 'Deslocamento de macho', 'Dimensional fora do desenho', 'Química fora da especificação', 'Dureza fora da especificação', 'Quebra na rebarbação'];

export const MECANICA: { chave: keyof Mecanica; nome: string; unidade: string }[] = [
  { chave: 'dureza', nome: 'Dureza', unidade: 'HB' },
  { chave: 'resistencia', nome: 'Limite de resistência', unidade: 'kgf/mm²' },
  { chave: 'escoamento', nome: 'Limite de escoamento', unidade: 'MPa' },
  { chave: 'alongamento', nome: 'Alongamento', unidade: '%' },
];

export function conferirCertificado(c: Certificado, base: Pick<BaseFenix, 'fichas' | 'ligas'>) {
  const ficha = base.fichas.find((f) => f.id === c.fichaId);
  const liga = base.ligas.find((l) => l.id === c.ligaId);
  if (!liga) return { ficha, liga, quimica: [], mecanica: [], ok: false };
  const quimica = conferirQuimica(ficha?.quimica ?? {}, liga);
  const mecanica = MECANICA.filter((m) => liga.mecanica[m.chave] || c.mecanica[m.chave] !== undefined)
    .map((m) => ({ ...m, valor: c.mecanica[m.chave], faixa: liga.mecanica[m.chave], ok: dentro(c.mecanica[m.chave], liga.mecanica[m.chave]) }));
  return { ficha, liga, quimica, mecanica, ok: quimica.every((q) => q.ok) && mecanica.every((m) => m.ok) };
}
