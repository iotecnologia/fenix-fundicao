// Modelos de dados do sistema Fênix. Cada aba "GERAÇÃO DE ..." da planilha virou uma lista de registros;
// as abas copiadas (OP (1), FF (1), RNC (1)…) viraram o DOCUMENTO impresso gerado a partir do registro.
// Datas sempre como texto 'YYYY-MM-DD'; meses como 'YYYY-MM'; pesos em kg; valores em R$.

export type Perfil = 'diretoria' | 'comercial' | 'producao' | 'qualidade' | 'administrativo';

export interface Usuario { id: string; email: string; nome: string; perfil: Perfil; cargo: string }

export interface Empresa {
  nome: string; fantasia: string; cnpj: string; endereco: string; cidade: string;
  telefones: string[]; emails: string[];
  responsavelTecnico: { nome: string; registro: string };
}

// ---------- cadastros ----------
export interface Cliente { id: string; nome: string; cnpj: string; contato: string; telefone: string; cidade: string; segmento: string }

/** Elementos químicos controlados (planilha: C, Si, Mn, P, S, Cu, Cr, Mg e, no certificado, Ni). */
export type Elemento = 'C' | 'Si' | 'Mn' | 'P' | 'S' | 'Cu' | 'Cr' | 'Ni' | 'Mg';
/** Faixa especificada: min/max em %. Sem min = "máximo de"; sem max = "mínimo de". */
export interface Faixa { min?: number; max?: number }

export interface Liga {
  id: string; nome: string; norma: string; tipo: 'cinzento' | 'nodular' | 'branco';
  quimica: Partial<Record<Elemento, Faixa>>;
  mecanica: { dureza?: Faixa; resistencia?: Faixa; escoamento?: Faixa; alongamento?: Faixa };
  temperatura: Faixa; // °C de vazamento
  precoBaseKg: number; // referência comercial
}

export interface Forno { id: string; nome: string; capacidadeKg: number; tipo: string }

export type GrupoInsumo = 'IFR' | 'IMF' | 'EPI' | 'IEL';
export interface Insumo {
  id: string; codigo: string; grupo: GrupoInsumo; nome: string; unidade: string;
  preco: number; estoqueMinimo: number;
  /** Vai na carga do forno (aparece na Ficha do Forno). 'metalico' soma na carga nominal; 'auxiliar' (fluxo) não. */
  carga?: 'metalico' | 'auxiliar';
}

// ---------- movimentos ----------
export interface MovInsumo {
  id: string; insumoId: string; data: string; tipo: 'retirada' | 'compra' | 'saldo_inicial';
  quantidade: number; valorUnit: number;
  notaFiscal?: string; fornecedor?: string;
  /** De onde veio a retirada (ex.: ficha do forno). */
  origem?: string;
}

// ---------- comercial ----------
export type StatusOrcamento = 'aberto' | 'aprovado' | 'perdido';
export interface ItemOrcamento { identificacao: string; pesoKg: number; quantidade: number }
export interface Orcamento {
  id: string; numero: string; data: string; clienteId: string; ligaId: string;
  precoKg: number; impostoPct: number; comissaoPct: number;
  /** Custo por kg fabricado usado no cálculo da margem (gravado no dia do orçamento). */
  custoKgRef: number;
  itens: ItemOrcamento[];
  formaPagamento: string; prazoEntrega: string; observacao: string;
  status: StatusOrcamento; validadeDias: number;
}

export interface NotaFaturada {
  id: string; data: string; notaFiscal: string; clienteId: string; ligaId: string;
  quantidadeKg: number; precoKg: number;
}

// ---------- produção ----------
export interface RefugoOP { data: string; quantidade: number; causa: string }
export interface OrdemProducao {
  id: string; numero: string; data: string; clienteId: string; desenho: string; ligaId: string;
  quantidade: number; pesoLiquidoKg: number; pesoBrutoKg: number;
  dataPrevista: string; dataEfetiva?: string;
  orcamentoId?: string;
  refugos: RefugoOP[];
}

export interface ItemCarga { insumoId: string; carga: number; correcao: number }
export interface PecaFundida { opId: string; pecas: number }
export interface FichaForno {
  id: string; numero: string; data: string; ligaId: string; fornoId: string;
  /** Posição da corrida no dia (1ª, 2ª…). */
  posicao: number;
  /** Nº de corridas no revestimento refratário atual. */
  usoRefratario: number;
  /** Retorno de canais e massalotes (metal próprio, não é insumo comprado). */
  retornoKg: number;
  carga: ItemCarga[];
  quimica: Partial<Record<Elemento, number>>;
  horaInicio: string; horaFim: string; temperatura: number;
  pecas: PecaFundida[];
  visto: string;
}

// ---------- qualidade ----------
export interface Rnc {
  id: string; numero: string; data: string; clienteId: string; opId?: string; desenho: string; ligaId: string;
  quantidade: number; pesoUnitKg: number; motivo: string; acaoCorretiva: string;
  status: 'aberta' | 'encerrada';
}

export interface Mecanica { dureza?: number; resistencia?: number; escoamento?: number; alongamento?: number }
export interface Certificado {
  id: string; numero: string; data: string; clienteId: string; notaFiscal: string;
  /** Corrida de origem: a química vem da ficha do forno (não é redigitada). */
  fichaId: string; ligaId: string;
  itens: string[];
  mecanica: Mecanica;
  tratamento?: { data: string; empresa: string; tipo: string; certificado: string };
  metalografia: string;
}

// ---------- gestão ----------
export interface Manutencao {
  id: string; data: string; equipamento: string; tipo: 'manutencao' | 'compra' | 'combustivel';
  motivo: string; dataPrevista?: string; dataRetorno?: string; valor: number; fornecedor: string;
}

export interface Colaborador { id: string; nome: string; cargo: string; salario: number; setor: string; ativo: boolean }
export interface LancamentoFolha { id: string; mes: string; colaboradorId: string; valor: number; horaExtra: number; encargos: number; outros: number }

/** Custos do mês que não vêm de outro módulo (planilha CUSTO MENSAL: energia, água e esgoto, diversos). */
export interface CustoFixo { mes: string; energia: number; agua: number; diversos: number }

export interface BaseFenix {
  empresa: Empresa;
  usuarios: Usuario[];
  clientes: Cliente[];
  ligas: Liga[];
  fornos: Forno[];
  insumos: Insumo[];
  movimentos: MovInsumo[];
  orcamentos: Orcamento[];
  faturamento: NotaFaturada[];
  ops: OrdemProducao[];
  fichas: FichaForno[];
  rncs: Rnc[];
  certificados: Certificado[];
  manutencoes: Manutencao[];
  colaboradores: Colaborador[];
  folha: LancamentoFolha[];
  custosFixos: CustoFixo[];
}
