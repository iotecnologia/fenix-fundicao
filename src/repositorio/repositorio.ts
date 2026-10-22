// Contrato de acesso aos dados. Telas e regras só conversam com isto.
// Hoje: repo-mock.ts (base fictícia gerada no navegador). Versão final: repo-api.ts (backend + PostgreSQL),
// sem refazer as telas.
import type { BaseFenix } from '../tipos/modelos';

export interface Repositorio {
  carregar(): Promise<BaseFenix>;
}
