// Gera a base FICTÍCIA do mock: ~6 meses de operação da fundição até hoje, de forma coerente entre os módulos:
//   orçamento aprovado → O.P → corridas (fichas do forno) com as peças da O.P → retirada dos insumos da carga
//   → refugo/RNC → O.P concluída → nota faturada → certificado de qualidade.
// Sorteio com semente fixa: a mesma data gera sempre a mesma base. Nenhum dado é de empresa ou pessoa real.
import type {
  BaseFenix, Certificado, Cliente, Colaborador, CustoFixo, Elemento, Empresa, FichaForno, Forno, Insumo, ItemCarga,
  LancamentoFolha, Liga, Manutencao, MovInsumo, NotaFaturada, Orcamento, OrdemProducao, Rnc, Usuario,
} from '../tipos/modelos';
import { diaSemana, hhmm, somaDias } from '../util/datas';
import { arred } from '../util/formato';
import { custoMes } from '../regras/custo';
import { COMPOSICAO, RETORNO, pesosFicha } from '../regras/forno';
import { saldo } from '../regras/insumos';
import { mesDe, proximoNumero, somaMes } from '../regras/periodo';
import { MOTIVOS_RNC } from '../regras/qualidade';
import empresa from '../dados/empresa.json';
import usuarios from '../dados/usuarios.json';
import clientes from '../dados/clientes.json';
import ligas from '../dados/ligas.json';
import fornos from '../dados/fornos.json';
import insumos from '../dados/insumos.json';

/** Sorteio previsível (mulberry32). */
function sorteador(semente: number) {
  let a = semente >>> 0;
  const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ent = (i: number, f: number) => i + Math.floor(r() * (f - i + 1));
  const um = <T,>(l: readonly T[]) => l[Math.floor(r() * l.length)];
  const entre = (i: number, f: number) => i + r() * (f - i);
  return { r, ent, um, entre };
}
type Sorteio = ReturnType<typeof sorteador>;

const FERIADOS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];
const diaUtil = (d: string) => diaSemana(d) >= 1 && diaSemana(d) <= 5 && !FERIADOS.includes(d.slice(5));
const proxUtil = (d: string, n: number) => { let x = d, k = 0; while (k < n) { x = somaDias(x, 1); if (diaUtil(x)) k++; } return x; };

// ---------- catálogo de peças por segmento do cliente ----------
interface Peca { desenho: string; ligaId: string; liq: number; rend: number; lote: [number, number] }
const PECAS_SEG: Record<string, [string, string, number, [number, number]][]> = {
  'Máquinas agrícolas': [['Polia 400 mm', 'gg20', 18.5, [20, 60]], ['Cubo de roda', 'ggg40', 12.4, [30, 80]], ['Suporte de mancal', 'ggg40', 6.8, [40, 120]], ['Contrapeso frontal', 'gg15', 42, [10, 30]]],
  'Sucroenergético': [['Bucha de moenda', 'gg25', 86, [4, 12]], ['Mancal de rolo', 'gg25', 140, [2, 8]], ['Grelha de caldeira', 'gg20', 9.6, [60, 200]], ['Pente de moenda', 'gg20', 34, [6, 20]]],
  'Mineração': [['Placa de desgaste', 'fbcr', 24, [20, 60]], ['Martelo de britador', 'fbcr', 38, [12, 40]], ['Revestimento de moinho', 'fbcr', 65, [6, 18]], ['Mandíbula móvel', 'ggg50', 120, [2, 6]]],
  'Bombas e válvulas': [['Carcaça de bomba 4"', 'gg25', 28, [10, 40]], ['Rotor fechado 250', 'gg20', 9.2, [20, 60]], ['Corpo de válvula 6"', 'ggg40', 31, [8, 24]], ['Tampa de bomba', 'gg20', 7.5, [20, 60]]],
  'Frigorífico': [['Grelha de piso', 'gg15', 14, [20, 80]], ['Tampa de caixa de inspeção', 'gg15', 22, [10, 40]]],
  'Metalurgia': [['Flange cego 8"', 'gg20', 16, [20, 60]], ['Engrenagem Z40', 'ggg50', 22, [10, 30]], ['Bucha guia', 'gg25', 5.4, [50, 150]]],
  'Agronegócio': [['Disco de plantadeira', 'ggg40', 3.8, [100, 300]], ['Contrapeso de trator', 'gg15', 48, [10, 30]]],
  'Beneficiamento de algodão': [['Engrenagem de descaroçador', 'ggg40', 11, [20, 60]], ['Mancal de serra', 'gg20', 6.2, [30, 90]]],
  'Implementos agrícolas': [['Cubo de grade aradora', 'ggg40', 9.5, [30, 90]], ['Mancal de grade', 'gg20', 7.8, [30, 90]], ['Disco de corte', 'ggg50', 6.1, [60, 160]]],
  'Óleos vegetais': [['Rosca de prensa', 'ggg50', 18, [6, 20]], ['Anel de prensa', 'gg25', 4.6, [40, 120]]],
  'Energia': [['Tampa de mancal de turbina', 'gg25', 95, [2, 6]], ['Bucha de comporta', 'ggg40', 26, [4, 12]]],
  'Transporte (peças de reposição)': [['Tambor de freio', 'gg25', 38, [10, 30]], ['Cubo de roda traseiro', 'ggg40', 21, [10, 30]]],
  'Cerâmica': [['Camisa de maromba', 'fbcr', 44, [4, 10]], ['Hélice de maromba', 'fbcr', 18, [6, 16]]],
};

function catalogoPecas(cl: readonly Cliente[], s: Sorteio): Map<string, Peca[]> {
  const m = new Map<string, Peca[]>();
  let n = 1040;
  for (const c of cl) {
    const lista = PECAS_SEG[c.segmento] ?? PECAS_SEG['Metalurgia'];
    m.set(c.id, lista.map(([nome, ligaId, liq, lote]) => ({ desenho: `DES-${n++} · ${nome}`, ligaId, liq: arred(liq * s.entre(0.92, 1.08), 1), rend: s.entre(0.62, 0.74), lote })));
  }
  return m;
}

function quimicaDa(liga: Liga, s: Sorteio, fora: boolean): Partial<Record<Elemento, number>> {
  const q: Partial<Record<Elemento, number>> = {};
  const els = Object.keys(liga.quimica) as Elemento[];
  const errado = fora ? s.um(els.filter((e) => liga.quimica[e]?.min !== undefined)) : undefined;
  for (const e of els) {
    const fx = liga.quimica[e]!;
    const lo = fx.min ?? (fx.max ?? 0) * 0.3, hi = fx.max ?? (fx.min ?? 0) * 1.3;
    let v = s.entre(lo + (hi - lo) * 0.15, hi - (hi - lo) * 0.15);
    if (e === errado) v = fx.min !== undefined && s.r() < 0.6 ? fx.min - (hi - lo) * s.entre(0.08, 0.25) : (fx.max ?? hi) + (hi - lo) * s.entre(0.08, 0.25);
    q[e] = arred(v, e === 'C' || e === 'Si' || e === 'Cr' ? 2 : 3);
  }
  return q;
}

const NOMES = ['Adão', 'Benedito', 'Cícero', 'Domingos', 'Edivaldo', 'Francisco', 'Gilmar', 'Hélio', 'Ivanildo', 'Jair', 'Lourival', 'Manoel', 'Nivaldo', 'Osmar', 'Pedro', 'Raimundo', 'Sebastião', 'Valdir', 'Wanderley', 'Zeca', 'Aparecida', 'Rosângela', 'Luciana', 'Simone', 'Edna', 'Moacir', 'Juarez', 'Orlando'];
const SOBRENOMES = ['Alves', 'Batista', 'Campos', 'Dias', 'Freitas', 'Gomes', 'Lima', 'Matos', 'Nunes', 'Pereira', 'Rocha', 'Santana', 'Teles', 'Vieira', 'Xavier', 'Moura', 'Cunha', 'Prates'];
const CARGOS: [string, string, number, number][] = [
  ['Forneiro', 'Fusão', 3400, 2], ['Ajudante de forneiro', 'Fusão', 2350, 2], ['Moldador', 'Moldagem', 2800, 5], ['Macheiro', 'Moldagem', 2700, 2],
  ['Rebarbador', 'Acabamento', 2450, 4], ['Operador de ponte rolante', 'Fusão', 2900, 1], ['Encarregado de produção', 'Produção', 5600, 1],
  ['Mecânico de manutenção', 'Manutenção', 3900, 1], ['Eletricista', 'Manutenção', 3800, 1], ['Analista da qualidade', 'Qualidade', 4200, 1],
  ['Auxiliar administrativo', 'Administrativo', 2600, 2], ['Vendedor', 'Comercial', 3800, 1], ['Motorista', 'Logística', 2900, 1], ['Auxiliar de limpeza', 'Administrativo', 1950, 1],
];
const EQUIP: [string, 'manutencao' | 'compra' | 'combustivel', string, [number, number], string][] = [
  ['Forno 1 · Bobina de indução', 'manutencao', 'Reaperto e teste de isolação da bobina', [1800, 4200], 'Indutherm Serviços Elétricos'],
  ['Forno 2 · Painel de potência', 'manutencao', 'Troca de capacitor do banco', [2600, 7800], 'Indutherm Serviços Elétricos'],
  ['Ponte rolante 5 t', 'manutencao', 'Revisão de freio e cabo de aço', [900, 2400], 'Içamentos MT'],
  ['Misturador de areia', 'manutencao', 'Troca de pás e rolamentos', [1200, 3100], 'Mecânica Industrial Rondon'],
  ['Jato de granalha', 'manutencao', 'Reposição de palhetas da turbina', [1400, 3600], 'Granalhas Centro-Oeste'],
  ['Compressor de ar', 'manutencao', 'Troca de óleo e filtros', [450, 1100], 'Ar Comprimido Rondon'],
  ['Empilhadeira 2,5 t', 'combustivel', 'Gás GLP P20 (4 cilindros)', [520, 760], 'Distribuidora de Gás Planalto'],
  ['Gerador diesel', 'combustivel', 'Óleo diesel S10', [800, 1900], 'Posto Rota 163'],
  ['Esmerilhadeira 9"', 'compra', 'Compra de esmerilhadeira nova', [780, 1250], 'Ferramentas Rondonópolis'],
  ['Caçamba de vazamento 500 kg', 'manutencao', 'Refazer revestimento refratário', [650, 1500], 'Refratários Cuiabá'],
];
const CAUSAS_OP = ['Porosidade', 'Inclusão de areia', 'Rechupe', 'Peça incompleta', 'Trinca', 'Quebra na rebarbação'];

export function gerarBase(hojeIso: string): BaseFenix {
  const s = sorteador(20260000 + Number(hojeIso.replace(/-/g, '').slice(2)));
  const inicio = somaMes(mesDe(hojeIso), -6) + '-01'; // 1 mês a mais de aquecimento: a fila de produção já começa cheia
  const cls = clientes as Cliente[];
  const lgs = ligas as Liga[];
  const frn = fornos as Forno[];
  const ins = insumos as Insumo[];
  const liga = (id: string) => lgs.find((l) => l.id === id)!;
  const insumo = (id: string) => ins.find((i) => i.id === id)!;
  const pecas = catalogoPecas(cls, s);
  const limitaHoje = (d: string) => (d > hojeIso ? hojeIso : d);

  const orcamentos: Orcamento[] = [], ops: OrdemProducao[] = [], fichas: FichaForno[] = [], rncs: Rnc[] = [];
  const movimentos: MovInsumo[] = [], faturamento: NotaFaturada[] = [], certificados: Certificado[] = [];
  let idn = 0; const id = (p: string) => `${p}${++idn}`;
  let nf = 18420;

  // estoque inicial: saldo do mês anterior ao início
  for (const i of ins) movimentos.push({ id: id('m'), insumoId: i.id, data: inicio, tipo: 'saldo_inicial', quantidade: arred(Math.max(i.estoqueMinimo * s.entre(1.6, 2.6), i.unidade === 'kg' ? 5 : 2), i.unidade === 'kg' || i.unidade === 'L' ? 0 : 0), valorUnit: i.preco });
  const estoque = new Map(ins.map((i) => [i.id, saldo(i.id, movimentos)]));
  // alguns itens deixam de ser repostos nas últimas semanas → aparecem abaixo do mínimo hoje
  const semRepor = new Set(['ifr-0013', 'imf-0004', 'epi-0011', 'epi-0023', 'iel-0008', 'ifr-0022']);
  const retirar = (insumoId: string, data: string, q: number, origem?: string) => {
    const i = insumo(insumoId);
    // não retira mais do que tem no estoque
    const quantidade = Math.min(arred(q, i.unidade === 'kg' || i.unidade === 'L' ? 1 : 0), Math.max(0, estoque.get(insumoId) ?? 0));
    if (quantidade <= 0) return;
    movimentos.push({ id: id('m'), insumoId, data, tipo: 'retirada', quantidade, valorUnit: i.preco, origem });
    const sd = (estoque.get(insumoId) ?? 0) - quantidade;
    estoque.set(insumoId, sd);
    const ultimas = data > somaDias(hojeIso, -18);
    if (sd < i.estoqueMinimo * 1.15 && !(ultimas && semRepor.has(insumoId)) && i.estoqueMinimo > 0) {
      const lote = arred(Math.max(i.estoqueMinimo * s.entre(1.6, 2.4), quantidade * 3), i.unidade === 'kg' || i.unidade === 'L' ? 0 : 0);
      const dc = limitaHoje(somaDias(data, s.ent(0, 2)));
      movimentos.push({ id: id('m'), insumoId, data: dc, tipo: 'compra', quantidade: lote, valorUnit: arred(i.preco * s.entre(0.96, 1.05)), notaFiscal: String(s.ent(10000, 99999)), fornecedor: fornecedorDe(i) });
      estoque.set(insumoId, sd + lote);
    }
  };

  /** Peças boas que ainda faltam fundir para a O.P. */
  const falta = (o: OrdemProducao) => {
    const fund = fichas.reduce((t, f) => t + f.pecas.filter((x) => x.opId === o.id).reduce((a, x) => a + x.pecas, 0), 0);
    const ref = o.refugos.reduce((t, r) => t + r.quantidade, 0);
    return o.quantidade - (fund - ref);
  };

  // ---------- percorre os dias ----------
  const usoRef = new Map(frn.map((f) => [f.id, s.ent(5, 40)]));
  for (let d = inicio; d <= hojeIso; d = somaDias(d, 1)) {
    const util = diaUtil(d);
    // orçamentos (1 a 2 por dia útil)
    if (util) {
      const n = s.r() < 0.55 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const c = s.um(cls);
        const cat = pecas.get(c.id)!;
        const p0 = s.um(cat);
        const doMesmaLiga = cat.filter((p) => p.ligaId === p0.ligaId);
        const escolhidas = doMesmaLiga.filter((p) => p === p0 || s.r() < 0.4).slice(0, 4);
        const lg = liga(p0.ligaId);
        const o: Orcamento = {
          id: id('o'), numero: proximoNumero(orcamentos, d, 4), data: d, clienteId: c.id, ligaId: lg.id,
          precoKg: arred(lg.precoBaseKg * s.entre(0.94, 1.1)), impostoPct: s.um([9.25, 10.5, 12]), comissaoPct: s.um([0, 1.5, 2, 3]), custoKgRef: 0,
          itens: escolhidas.map((p) => ({ identificacao: p.desenho, pesoKg: p.liq, quantidade: Math.round(s.ent(p.lote[0], p.lote[1]) * 1.6) })),
          formaPagamento: s.um(['28 dias', '28/56 dias', '30/60/90 dias', '50% no pedido e 50% na entrega']),
          prazoEntrega: s.um(['15 dias úteis', '20 dias úteis', '25 dias úteis', '30 dias corridos']),
          observacao: s.r() < 0.3 ? 'Peças entregues rebarbadas e jateadas. Usinagem por conta do cliente.' : '',
          status: 'aberto', validadeDias: 15,
        };
        orcamentos.push(o);
      }
    }
    // aprovação dos orçamentos de ~5 a 12 dias atrás → O.P
    for (const o of orcamentos) {
      if (o.status !== 'aberto' || o.data > somaDias(d, -5)) continue;
      if (o.data <= somaDias(d, -12) || s.r() < 0.12) {
        if (s.r() < 0.6) {
          o.status = 'aprovado';
          for (const it of o.itens) {
            const p = pecas.get(o.clienteId)!.find((x) => x.desenho === it.identificacao)!;
            ops.push({
              id: id('op'), numero: proximoNumero(ops, d), data: d, clienteId: o.clienteId, desenho: it.identificacao, ligaId: o.ligaId,
              quantidade: it.quantidade, pesoLiquidoKg: p.liq, pesoBrutoKg: arred(p.liq / p.rend, 1),
              dataPrevista: proxUtil(d, s.ent(7, 20)), orcamentoId: o.id, refugos: [],
            });
          }
        } else o.status = 'perdido';
      }
    }
    // pedido de repetição (sem orçamento), de vez em quando
    if (util && s.r() < 0.25) {
      const c = s.um(cls); const p = s.um(pecas.get(c.id)!);
      ops.push({ id: id('op'), numero: proximoNumero(ops, d), data: d, clienteId: c.id, desenho: p.desenho, ligaId: p.ligaId, quantidade: Math.round(s.ent(p.lote[0], p.lote[1]) * 1.6), pesoLiquidoKg: p.liq, pesoBrutoKg: arred(p.liq / p.rend, 1), dataPrevista: proxUtil(d, s.ent(10, 18)), refugos: [] });
    }
    if (!util && !(diaSemana(d) === 6 && s.r() < 0.3)) continue;

    // ---------- corridas do dia ----------
    // O.P só entra no forno depois de moldes e machos prontos (3 dias úteis)
    const abertas = () => ops.filter((o) => !o.dataEfetiva && proxUtil(o.data, 3) <= d);
    const backlog = abertas().reduce((t, o) => t + Math.max(0, falta(o)) * o.pesoBrutoKg, 0);
    const nCorridas = d === hojeIso ? Math.min(2, Math.ceil(backlog / 700)) : Math.min(3, Math.ceil(backlog / 650));
    for (let pos = 1; pos <= nCorridas; pos++) {
      const pend = abertas().filter((o) => falta(o) > 0).sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
      if (!pend.length) break;
      const lg = liga(pend[0].ligaId);
      const forno = pos % 2 === 1 ? frn[1] : frn[0];
      const nominalAlvo = forno.capacidadeKg * s.entre(0.86, 0.98);
      let bruto = 0; const pcs: { opId: string; pecas: number }[] = [];
      for (const o of pend.filter((x) => x.ligaId === lg.id)) {
        const cabe = Math.floor((nominalAlvo * 0.93 - bruto) / o.pesoBrutoKg);
        if (cabe <= 0) continue;
        // moldagem limita: no máximo metade da O.P por corrida
        const q = Math.min(cabe, falta(o), Math.max(1, Math.ceil(o.quantidade * 0.5)));
        if (q > 0) { pcs.push({ opId: o.id, pecas: q }); bruto += q * o.pesoBrutoKg; }
      }
      if (!pcs.length) continue;
      const nominal = Math.max(bruto / s.entre(0.9, 0.95), bruto + 15);
      const retornoKg = arred(nominal * RETORNO[lg.tipo], 0);
      const carga: ItemCarga[] = COMPOSICAO[lg.tipo].map(([insumoId, f]) => ({ insumoId, carga: arred(nominal * f * s.entre(0.95, 1.05), insumo(insumoId).preco > 10 ? 1 : 0), correcao: 0 }));
      if (lg.id === 'gg25' || lg.id === 'ggg50') carga.push({ insumoId: 'ifr-0006', carga: arred(nominal * 0.005, 1), correcao: 0 });
      // ajuste para a carga nominal fechar com o planejado
      const somaMet = retornoKg + carga.reduce((t, c) => t + c.carga, 0);
      const ajuste = carga.find((c) => c.insumoId === 'ifr-0001') ?? carga[0];
      ajuste.carga = arred(Math.max(0, ajuste.carga + nominal - somaMet), 0);
      // correção depois da análise (FeSi ou grafite), às vezes
      if (s.r() < 0.35) { const c = carga.find((x) => x.insumoId === 'ifr-0007' || x.insumoId === 'ifr-0003'); if (c) c.correcao = arred(s.entre(1.5, 6), 1); }
      carga.push({ insumoId: 'ifr-0004', carga: arred(nominal * 0.0015, 1), correcao: 0 });
      const ini = 7 * 60 + (pos - 1) * 105 + s.ent(0, 15);
      const uso = (usoRef.get(forno.id) ?? 0) + 1;
      const novoRevest = uso > s.ent(55, 70);
      usoRef.set(forno.id, novoRevest ? 1 : uso);
      const ff: FichaForno = {
        id: id('ff'), numero: proximoNumero(fichas, d), data: d, ligaId: lg.id, fornoId: forno.id, posicao: pos, usoRefratario: novoRevest ? 1 : uso,
        retornoKg, carga, quimica: quimicaDa(lg, s, s.r() < 0.07),
        horaInicio: hhmm(ini), horaFim: hhmm(ini + s.ent(70, 105)),
        temperatura: s.r() < 0.06 ? (lg.temperatura.min ?? 1400) - s.ent(10, 30) : s.ent((lg.temperatura.min ?? 1400) + 10, (lg.temperatura.max ?? 1480) - 5),
        pecas: pcs, visto: s.um(['J. Batista', 'F. Gomes', 'M. Rocha']),
      };
      fichas.push(ff);
      for (const c of carga) retirar(c.insumoId, d, c.carga + c.correcao, 'FF ' + ff.numero);
      if (novoRevest) { retirar('ifr-0016', d, s.ent(320, 420), 'Revestimento ' + forno.nome); retirar('ifr-0017', d, 1, 'Revestimento ' + forno.nome); }
      retirar('ifr-0013', d, s.ent(1, 2));
      if (lg.tipo === 'nodular') retirar('ifr-0012', d, s.ent(1, 3));
      // refugo de peças desta corrida (descoberto na rebarbação, 1 a 2 dias depois)
      for (const p of pcs) {
        if (s.r() < 0.16) {
          const op = ops.find((o) => o.id === p.opId)!;
          const q = Math.max(1, Math.min(p.pecas, Math.round(p.pecas * s.entre(0.03, 0.12))));
          const dr = limitaHoje(somaDias(d, s.ent(1, 2)));
          const causa = s.um(CAUSAS_OP);
          op.refugos.push({ data: dr, quantidade: q, causa });
          rncs.push({
            id: id('rnc'), numero: proximoNumero(rncs, dr), data: dr, clienteId: op.clienteId, opId: op.id, desenho: op.desenho, ligaId: op.ligaId,
            quantidade: q, pesoUnitKg: op.pesoBrutoKg, motivo: MOTIVOS_RNC.find((m) => m.toLowerCase().includes(causa.toLowerCase().split(' ')[0])) ?? causa,
            acaoCorretiva: s.um(['Revisar sistema de alimentação (massalote) do modelo.', 'Aumentar tempo de cura da resina e conferir permeabilidade.', 'Conferir temperatura de vazamento antes de liberar a panela.', 'Treinamento do moldador na compactação da caixa.', 'Ajustar inoculação no jato.', 'Revisar procedimento de rebarbação (corte longe da peça).']),
            status: dr < somaDias(hojeIso, -10) ? 'encerrada' : s.r() < 0.5 ? 'aberta' : 'encerrada',
          });
        }
      }
      // O.P concluída?
      for (const p of pcs) {
        const op = ops.find((o) => o.id === p.opId)!;
        if (falta(op) <= 0 && !op.dataEfetiva) {
          const de = somaDias(d, s.ent(1, 3));
          if (de > hojeIso) continue;
          op.dataEfetiva = de;
          const orc = orcamentos.find((o) => o.id === op.orcamentoId);
          const dn = limitaHoje(somaDias(de, s.ent(0, 2)));
          const nota: NotaFaturada = { id: id('nf'), data: dn, notaFiscal: String(++nf), clienteId: op.clienteId, ligaId: op.ligaId, quantidadeKg: arred(op.pesoLiquidoKg * op.quantidade, 1), precoKg: orc?.precoKg ?? arred(liga(op.ligaId).precoBaseKg * s.entre(0.98, 1.08)) };
          faturamento.push(nota);
          const cliente = cls.find((c) => c.id === op.clienteId)!;
          if (['Mineração', 'Energia', 'Sucroenergético', 'Bombas e válvulas'].includes(cliente.segmento) || s.r() < 0.25) {
            const lgx = liga(op.ligaId);
            const mec: Certificado['mecanica'] = {};
            const dentroDe = (fx?: { min?: number; max?: number }, casas = 0) => fx ? arred(s.entre(fx.min ?? (fx.max ?? 0) * 0.8, fx.max ?? (fx.min ?? 0) * 1.25), casas) : undefined;
            if (lgx.mecanica.dureza) mec.dureza = dentroDe({ min: (lgx.mecanica.dureza.min ?? 0) + 5, max: (lgx.mecanica.dureza.max ?? 0) - 5 });
            if (lgx.mecanica.resistencia) mec.resistencia = dentroDe(lgx.mecanica.resistencia, 1);
            if (lgx.mecanica.escoamento) mec.escoamento = dentroDe(lgx.mecanica.escoamento);
            if (lgx.mecanica.alongamento) mec.alongamento = dentroDe(lgx.mecanica.alongamento, 1);
            const ultimaFicha = [...fichas].reverse().find((f) => f.pecas.some((x) => x.opId === op.id))!;
            certificados.push({
              id: id('cq'), numero: proximoNumero(certificados, dn), data: dn, clienteId: op.clienteId, notaFiscal: nota.notaFiscal, fichaId: ultimaFicha.id, ligaId: op.ligaId,
              itens: [op.desenho], mecanica: mec,
              tratamento: lgx.tipo === 'branco' ? { data: somaDias(de, -1), empresa: 'Tratamentos Térmicos Cuiabá', tipo: 'Têmpera e revenimento', certificado: 'TT-' + s.ent(2000, 9999) } : undefined,
              metalografia: lgx.tipo === 'nodular' ? `Grafita esferoidal, nodularização ${s.ent(85, 95)}%, matriz ferrítico-perlítica.` : lgx.tipo === 'cinzento' ? 'Grafita lamelar tipo A, tamanho 4-5, matriz perlítica.' : 'Carbonetos M7C3 em matriz martensítica.',
            });
          }
        }
      }
    }
    // ---------- moldagem, rebarbação, EPI e escritório (consumo do dia) ----------
    const brutoDia = fichas.filter((f) => f.data === d).reduce((t, f) => t + f.pecas.reduce((a, p) => a + p.pecas * (ops.find((o) => o.id === p.opId)?.pesoBrutoKg ?? 0), 0), 0);
    if (brutoDia > 0) {
      retirar('imf-0001', d, brutoDia * s.entre(0.5, 0.7));
      retirar('imf-0003', d, brutoDia * s.entre(0.010, 0.013));
      retirar('imf-0004', d, brutoDia * s.entre(0.003, 0.004));
      retirar('imf-0012', d, brutoDia * s.entre(0.0015, 0.0025));
      retirar('imf-0022', d, brutoDia * s.entre(0.001, 0.002));
      retirar(s.um(['imf-0035', 'imf-0036', 'imf-0037', 'imf-0038']), d, s.ent(4, 14));
      if (s.r() < 0.3) retirar('imf-0010', d, s.ent(4, 12));
      if (s.r() < 0.2) retirar('imf-0016', d, s.ent(2, 5));
      retirar('ifr-0022', d, s.ent(2, 5)); retirar('ifr-0024', d, s.ent(1, 3)); retirar('ifr-0023', d, s.ent(2, 6));
      if (s.r() < 0.3) retirar('ifr-0031', d, s.ent(1, 3));
    }
    if (diaSemana(d) === 1) {
      for (const e of ['epi-0003', 'epi-0004', 'epi-0009', 'epi-0010', 'epi-0014']) retirar(e, d, s.ent(4, 12));
      if (s.r() < 0.5) retirar('epi-0011', d, s.ent(1, 3));
      if (s.r() < 0.3) retirar(s.um(ins.filter((i) => i.nome.startsWith('Sapato')).map((i) => i.id)), d, 1);
      if (s.r() < 0.3) retirar(s.um(['epi-0005', 'epi-0006', 'epi-0007', 'epi-0008']), d, s.ent(1, 3));
      for (const e of ['iel-0009', 'iel-0010', 'iel-0015', 'iel-0016', 'iel-0017', 'iel-0018', 'iel-0020']) retirar(e, d, s.ent(1, 4));
      if (s.r() < 0.4) retirar('iel-0001', d, s.ent(1, 2));
      if (s.r() < 0.25) retirar('iel-0008', d, 1);
      if (s.r() < 0.4) retirar('ifr-0014', d, s.ent(20, 60));
    }
  }
  // RNC de reclamação de cliente (peça devolvida), algumas por mês
  for (let m = 0; m < 7; m++) {
    const mes = somaMes(mesDe(inicio), m);
    for (let k = 0; k < s.ent(1, 3); k++) {
      const op = s.um(ops.filter((o) => o.dataEfetiva && o.dataEfetiva.startsWith(mes)).concat([]));
      if (!op) continue;
      const dr = somaDias(op.dataEfetiva!, s.ent(5, 12));
      if (dr > hojeIso) continue;
      rncs.push({ id: id('rnc'), numero: proximoNumero(rncs, dr), data: dr, clienteId: op.clienteId, opId: op.id, desenho: op.desenho, ligaId: op.ligaId, quantidade: s.ent(1, 4), pesoUnitKg: op.pesoBrutoKg, motivo: s.um(['Dimensional fora do desenho', 'Porosidade / bolha de gás', 'Dureza fora da especificação']), acaoCorretiva: 'Peça devolvida pelo cliente. Reposição programada e revisão do modelo.', status: dr < somaDias(hojeIso, -15) ? 'encerrada' : 'aberta' });
    }
  }
  rncs.sort((a, b) => a.data.localeCompare(b.data) || a.numero.localeCompare(b.numero));
  // renumera RNC na ordem das datas
  const porMes = new Map<string, number>();
  for (const r of rncs) { const p = r.data.slice(5, 7) + '.' + r.data.slice(2, 4); const n = (porMes.get(p) ?? 0) + 1; porMes.set(p, n); r.numero = `${p}-${String(n).padStart(3, '0')}`; }
  // itens sem reposição recente: ficam abaixo do mínimo hoje (para a apresentação mostrar o alerta)
  for (const iid of semRepor) {
    const i = insumo(iid), sd = saldo(iid, movimentos);
    if (sd >= i.estoqueMinimo) movimentos.push({ id: id('m'), insumoId: iid, data: somaDias(hojeIso, -s.ent(1, 4)), tipo: 'retirada', quantidade: arred(sd - i.estoqueMinimo * s.entre(0.3, 0.7), 0), valorUnit: i.preco, origem: 'Retirada para o setor' });
  }
  movimentos.sort((a, b) => a.data.localeCompare(b.data));
  // duas O.P da fila com o prazo já vencido (a produção está atrás do prometido)
  ops.filter((o) => !o.dataEfetiva && o.data < somaDias(hojeIso, -10) && falta(o) > 0).slice(0, 2).forEach((o, k) => { o.dataPrevista = somaDias(hojeIso, -(2 + k * 3)); });

  // ---------- pessoal, manutenção e custos fixos ----------
  const colaboradores: Colaborador[] = [];
  let ci = 0;
  for (const [cargo, setor, sal, qtd] of CARGOS) for (let k = 0; k < qtd; k++) {
    colaboradores.push({ id: 'col' + ++ci, nome: `${NOMES[(ci * 7) % NOMES.length]} ${SOBRENOMES[(ci * 5) % SOBRENOMES.length]}`, cargo, setor, salario: arred(sal * s.entre(0.95, 1.08)), ativo: true });
  }
  const meses = Array.from({ length: 7 }, (_, i) => somaMes(mesDe(inicio), i));
  const folha: LancamentoFolha[] = [];
  for (const mes of meses) for (const c of colaboradores) {
    const he = ['Fusão', 'Moldagem', 'Acabamento'].includes(c.setor) ? arred(s.r() < 0.6 ? s.entre(80, 650) : 0) : 0;
    folha.push({ id: id('fo'), mes, colaboradorId: c.id, valor: c.salario, horaExtra: he, encargos: arred(c.salario * 0.288), outros: arred(s.r() < 0.3 ? s.entre(60, 300) : 0) });
  }
  const manutencoes: Manutencao[] = [];
  for (let d = inicio; d <= hojeIso; d = somaDias(d, 1)) {
    if (!diaUtil(d) || s.r() > 0.36) continue;
    const [equipamento, tipo, motivo, [vi, vf], fornecedor] = s.um(EQUIP);
    const ret = tipo === 'manutencao' ? somaDias(d, s.ent(1, 8)) : undefined;
    manutencoes.push({ id: id('mn'), data: d, equipamento, tipo, motivo, fornecedor, valor: arred(s.entre(vi, vf)), dataPrevista: ret, dataRetorno: ret && ret <= hojeIso && s.r() < 0.9 ? somaDias(ret, s.ent(0, 2)) : undefined });
  }
  const custosFixos: CustoFixo[] = meses.map((mes) => {
    const fichMes = fichas.filter((f) => f.data.startsWith(mes));
    const bruto = fichMes.reduce((t, f) => t + pesosFicha(f, { ops }).bruto, 0);
    const parcial = mes === mesDe(hojeIso) ? Number(hojeIso.slice(8)) / 30 : 1;
    return { mes, energia: arred(bruto * 0.62 * 0.94 + 6800 * parcial), agua: arred(s.entre(1150, 1650) * parcial), diversos: arred(s.entre(4800, 7200) * parcial) };
  });

  const base: BaseFenix = {
    empresa: empresa as Empresa, usuarios: (usuarios as (Usuario & { sal: string; hash: string })[]).map(({ sal: _s, hash: _h, ...u }) => u),
    clientes: cls, ligas: lgs, fornos: frn, insumos: ins, movimentos,
    orcamentos, faturamento, ops, fichas, rncs, certificados, manutencoes, colaboradores, folha, custosFixos,
  };
  // custo por kg de referência do orçamento: o do mês anterior fechado (o 1º mês usa o próprio)
  const custoRef = new Map(meses.map((m) => [m, custoMes(base, m).custoKg]));
  for (const o of orcamentos) {
    const m = mesDe(o.data);
    o.custoKgRef = custoRef.get(somaMes(m, -1)) ?? custoRef.get(m) ?? 0;
  }
  return base;
}

function fornecedorDe(i: Insumo): string {
  if (i.grupo === 'IFR') return i.nome.startsWith('Sucata') ? 'Reciclagem de Metais Rondon' : i.carga ? 'Ferroligas Brasil Central' : 'Refratários e Abrasivos MT';
  if (i.grupo === 'IMF') return i.nome.startsWith('Areia') ? 'Mineração de Areia Rio Vermelho' : 'Química para Fundição Centro-Oeste';
  if (i.grupo === 'EPI') return 'Segurança do Trabalho Rondonópolis';
  return 'Atacado Rondon';
}
