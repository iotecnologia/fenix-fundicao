// Catálogo de páginas do menu e PERFIS DE USUÁRIO.
// `perfis` = quem abre a página; `edita` = quem pode criar/alterar (os demais só consultam).
import type { Perfil } from '../tipos/modelos';

export interface Pagina { id: string; rota: string; nome: string; grupo: string; icone: string; perfis: Perfil[]; edita: Perfil[]; planilha: string }

export const PERFIS: Record<Perfil, { nome: string; descricao: string }> = {
  diretoria: { nome: 'Diretoria', descricao: 'Vê e altera tudo, inclusive custos, folha e usuários' },
  comercial: { nome: 'Comercial', descricao: 'Orçamentos, clientes e faturamento; consulta produção e certificados' },
  producao: { nome: 'Produção', descricao: 'O.P, fichas do forno, insumos e manutenção; abre RNC' },
  qualidade: { nome: 'Qualidade', descricao: 'RNC, certificados, ligas e normas; consulta produção' },
  administrativo: { nome: 'Administrativo', descricao: 'Compras de insumos, manutenção, folha e faturamento' },
};

const T: Perfil[] = ['diretoria', 'comercial', 'producao', 'qualidade', 'administrativo'];
const D: Perfil[] = ['diretoria'];

export const PAGINAS: Pagina[] = [
  { id: 'visao', rota: '/visao', nome: 'Visão Geral', grupo: '', icone: 'inicio', perfis: T, edita: [], planilha: 'ÍNDICE' },
  { id: 'orcamentos', rota: '/orcamentos', nome: 'Orçamentos', grupo: 'Comercial', icone: 'orcamento', perfis: ['diretoria', 'comercial'], edita: ['diretoria', 'comercial'], planilha: 'GERAÇÃO DE ORÇAMENTO' },
  { id: 'faturamento', rota: '/faturamento', nome: 'Faturamento', grupo: 'Comercial', icone: 'nota', perfis: ['diretoria', 'comercial', 'administrativo'], edita: ['diretoria', 'comercial', 'administrativo'], planilha: 'FATURAMENTO' },
  { id: 'clientes', rota: '/clientes', nome: 'Clientes', grupo: 'Comercial', icone: 'predio', perfis: ['diretoria', 'comercial', 'administrativo'], edita: ['diretoria', 'comercial'], planilha: '— (novo)' },
  { id: 'ops', rota: '/ops', nome: 'Ordens de Produção', grupo: 'Produção', icone: 'lista', perfis: ['diretoria', 'producao', 'comercial', 'qualidade'], edita: ['diretoria', 'producao'], planilha: 'GERAÇÃO DE O.P' },
  { id: 'fichas', rota: '/fichas', nome: 'Fichas do Forno', grupo: 'Produção', icone: 'fogo', perfis: ['diretoria', 'producao', 'qualidade'], edita: ['diretoria', 'producao'], planilha: 'GERAÇÃO F.F' },
  { id: 'rnc', rota: '/rnc', nome: 'RNC', grupo: 'Qualidade', icone: 'alerta', perfis: ['diretoria', 'qualidade', 'producao'], edita: ['diretoria', 'qualidade', 'producao'], planilha: 'GERAÇÃO DE R.N.C' },
  { id: 'certificados', rota: '/certificados', nome: 'Certificados', grupo: 'Qualidade', icone: 'escudo', perfis: ['diretoria', 'qualidade', 'comercial'], edita: ['diretoria', 'qualidade'], planilha: 'GERAÇÃO DE CERTIFICADO' },
  { id: 'ligas', rota: '/ligas', nome: 'Ligas e Fornos', grupo: 'Qualidade', icone: 'tubo', perfis: ['diretoria', 'qualidade', 'producao'], edita: ['diretoria', 'qualidade'], planilha: '— (estava digitado em cada FF e CQ)' },
  { id: 'insumos', rota: '/insumos', nome: 'Insumos', grupo: 'Suprimentos', icone: 'caixa', perfis: ['diretoria', 'producao', 'administrativo'], edita: ['diretoria', 'producao', 'administrativo'], planilha: 'CONSUMO DE I.F.R / I.M.F / E.P.I / I.E.L' },
  { id: 'manutencao', rota: '/manutencao', nome: 'Manutenção', grupo: 'Suprimentos', icone: 'ferramenta', perfis: ['diretoria', 'administrativo', 'producao'], edita: ['diretoria', 'administrativo', 'producao'], planilha: 'MANUTENÇÃO' },
  { id: 'custo', rota: '/custo', nome: 'Custo Mensal', grupo: 'Gestão', icone: 'carteira', perfis: D, edita: D, planilha: 'CUSTO MENSAL' },
  { id: 'folha', rota: '/folha', nome: 'Folha de Pagamento', grupo: 'Gestão', icone: 'usuarios', perfis: ['diretoria', 'administrativo'], edita: ['diretoria', 'administrativo'], planilha: 'FOLHA PAGAMENTO' },
  { id: 'indicadores', rota: '/indicadores', nome: 'Indicadores (BI)', grupo: 'Gestão', icone: 'grafico', perfis: D, edita: [], planilha: '— (novo)' },
  { id: 'usuarios', rota: '/usuarios', nome: 'Usuários e Perfis', grupo: 'Administração', icone: 'chave', perfis: D, edita: D, planilha: '— (novo)' },
];

export const GRUPOS = ['', 'Comercial', 'Produção', 'Qualidade', 'Suprimentos', 'Gestão', 'Administração'];

export const podeAbrir = (id: string, p: Perfil) => !!PAGINAS.find((x) => x.id === id)?.perfis.includes(p);
export const podeEditar = (id: string, p: Perfil) => !!PAGINAS.find((x) => x.id === id)?.edita.includes(p);
