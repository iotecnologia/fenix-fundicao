// Registro aberto na página fica na URL (?abrir=id ou ?abrir=novo): a busca do topo e os links entre telas
// abrem a página já com o registro na tela, e o botão "voltar" do navegador fecha a janela.
import { useSearchParams } from 'react-router-dom';

export function useAbrir(): [string | null, (id: string | null) => void] {
  const [sp, setSp] = useSearchParams();
  const id = sp.get('abrir');
  const definir = (v: string | null) => setSp(v ? { abrir: v } : {});
  return [id, definir];
}
