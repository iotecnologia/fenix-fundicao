// Mês de referência e numeração dos documentos.
// Planilha: cada arquivo era um mês (ÍNDICE!L2 = "10.26") e os documentos eram numerados 001, 002… dentro do mês.
// No sistema o histórico é contínuo; a numeração continua "MM.AA-NNN", reiniciando a cada mês, como a fundição já usa.
import { nomeMes } from '../util/datas';

/** '2026-10-21' → '2026-10' */
export const mesDe = (data: string) => data.slice(0, 7);
export const noMes = (data: string, mes: string) => data.startsWith(mes);
export const somaMes = (mes: string, n: number) => {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
export const fimDoMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return `${mes}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`;
};
/** '2026-10' → 'outubro de 2026' */
export const nomeMesLongo = (mes: string) => { const [a, m] = mes.split('-').map(Number); return `${nomeMes(m - 1)} de ${a}`; };
/** '2026-10' → 'Out/26' */
export const mesCurto = (mes: string) => { const [a, m] = mes.split('-').map(Number); const n = nomeMes(m - 1); return `${n[0].toUpperCase()}${n.slice(1, 3)}/${String(a).slice(2)}`; };
/** Os últimos n meses até `mes` (inclusive), do mais antigo ao mais novo. */
export const ultimosMeses = (mes: string, n: number) => Array.from({ length: n }, (_, i) => somaMes(mes, i - n + 1));

/** Prefixo do mês, igual ao da planilha: '2026-10-21' → '10.26' */
export const prefixoMes = (data: string) => `${data.slice(5, 7)}.${data.slice(2, 4)}`;

/** Próximo número do mês da data: '10.26-001', '10.26-002'… */
export function proximoNumero(existentes: readonly { numero: string }[], data: string, digitos = 3): string {
  const pre = prefixoMes(data) + '-';
  const maior = existentes.filter((x) => x.numero.startsWith(pre)).reduce((m, x) => Math.max(m, Number(x.numero.slice(pre.length)) || 0), 0);
  return pre + String(maior + 1).padStart(digitos, '0');
}
