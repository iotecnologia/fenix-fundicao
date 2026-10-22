// Base carregada pelo repositório + ações de gravação.
// No mock tudo fica só na memória da página: recarregou, volta ao início. Na versão final cada ação chama a API.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { BaseFenix, CustoFixo, FichaForno, MovInsumo } from '../tipos/modelos';
import type { Repositorio } from '../repositorio/repositorio';

/** Coleções da base que são listas de registros com id. */
export type Colecao = { [K in keyof BaseFenix]: BaseFenix[K] extends readonly { id: string }[] ? K : never }[keyof BaseFenix];
type Item<K extends Colecao> = BaseFenix[K][number];

interface Acoes {
  /** Cria (sem id ou id novo) ou altera um registro. Devolve o registro gravado. */
  salvar<K extends Colecao>(col: K, item: Item<K>): Item<K>;
  remover(col: Colecao, id: string): void;
  /** Grava a ficha do forno e refaz as retiradas de estoque dos insumos da carga (origem "FF nº"). */
  gravarFicha(f: FichaForno): void;
  /** Energia, água e diversos do mês (guardados por mês). */
  salvarFixo(c: CustoFixo): void;
  novoId(prefixo: string): string;
}
interface Ctx { base: BaseFenix; acoes: Acoes }
const C = createContext<Ctx | null>(null);

let seq = 0;
const novoId = (p: string) => `${p}n${Date.now().toString(36)}${++seq}`;

/** Carrega a base. Só é montado DEPOIS do login. Enquanto carrega não desenha nada: a tela de abertura mostra a espera. */
export function DadosProvider({ repo, children, aoCarregar }: { repo: Repositorio; children: ReactNode; aoCarregar?: () => void }) {
  const [base, setBase] = useState<BaseFenix | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => { repo.carregar().then((b) => { setBase(b); aoCarregar?.(); }).catch((e) => setErro(String(e))); }, 30);
    return () => clearTimeout(t);
  }, [repo]); // eslint-disable-line react-hooks/exhaustive-deps
  if (erro) return <div className="vazio">Não foi possível carregar os dados: {erro}</div>;
  if (!base) return null;

  const acoes: Acoes = {
    salvar(col, item) {
      setBase((b) => {
        if (!b) return b;
        const lista = b[col] as unknown as { id: string }[];
        const existe = lista.some((x) => x.id === item.id);
        return { ...b, [col]: existe ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item] };
      });
      return item;
    },
    remover(col, id) {
      setBase((b) => b && { ...b, [col]: (b[col] as unknown as { id: string }[]).filter((x) => x.id !== id) });
    },
    gravarFicha(f) {
      setBase((b) => {
        if (!b) return b;
        const origem = 'FF ' + f.numero;
        const retiradas: MovInsumo[] = f.carga.filter((c) => c.carga + c.correcao > 0).map((c) => ({
          id: novoId('m'), insumoId: c.insumoId, data: f.data, tipo: 'retirada', quantidade: +(c.carga + c.correcao).toFixed(1),
          valorUnit: b.insumos.find((i) => i.id === c.insumoId)?.preco ?? 0, origem,
        }));
        const existe = b.fichas.some((x) => x.id === f.id);
        return {
          ...b,
          fichas: existe ? b.fichas.map((x) => (x.id === f.id ? f : x)) : [...b.fichas, f],
          movimentos: [...b.movimentos.filter((m) => m.origem !== origem), ...retiradas],
        };
      });
    },
    salvarFixo(c) {
      setBase((b) => b && { ...b, custosFixos: [...b.custosFixos.filter((x) => x.mes !== c.mes), c] });
    },
    novoId,
  };
  return <C.Provider value={{ base, acoes }}>{children}</C.Provider>;
}

export function useDados(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useDados fora do DadosProvider');
  return c;
}
