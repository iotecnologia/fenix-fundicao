// Tela de abertura depois do login (mesmo padrão do Analiza / IO Clinic): logo pulsando com ondas, saudação,
// barra de progresso e mensagens dos passos. Enquanto ela roda, os dados são carregados por baixo.
// `rapida`: ao recarregar a página já logado, só espera os dados ficarem prontos.
import { useEffect, useState } from 'react';
import type { Perfil } from '../tipos/modelos';
import { Logo } from './Marca';

const COMUM = 'Conferindo seu acesso…';
const PASSOS: Record<Perfil, string[]> = {
  diretoria: [COMUM, 'Somando os custos do mês…', 'Calculando o custo por kg fabricado…', 'Preparando os indicadores…'],
  comercial: [COMUM, 'Carregando orçamentos e clientes…', 'Buscando o custo por kg de referência…', 'Preparando sua área de trabalho…'],
  producao: [COMUM, 'Carregando as ordens de produção…', 'Organizando as corridas do forno…', 'Conferindo o estoque de insumos…'],
  qualidade: [COMUM, 'Carregando RNC e certificados…', 'Conferindo a química das corridas…', 'Preparando sua área de trabalho…'],
  administrativo: [COMUM, 'Carregando compras e estoque…', 'Organizando manutenção e folha…', 'Preparando sua área de trabalho…'],
};
const PASSO_MS = 650;

export function Abertura({ nome, perfil, dadosProntos, rapida, fim }: { nome: string; perfil: Perfil; dadosProntos: boolean; rapida?: boolean; fim: () => void }) {
  const passos = PASSOS[perfil];
  const [i, setI] = useState(rapida ? passos.length : 0);
  useEffect(() => {
    if (rapida) return;
    const t = setInterval(() => setI((x) => Math.min(x + 1, passos.length + 1)), PASSO_MS);
    return () => clearInterval(t);
  }, [rapida, passos.length]);
  useEffect(() => {
    if (dadosProntos && (rapida || i > passos.length)) { const t = setTimeout(fim, rapida ? 250 : 0); return () => clearTimeout(t); }
  }, [dadosProntos, rapida, i, passos.length, fim]);
  const h = new Date().getHours();
  const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const msg = i < passos.length ? passos[i] : dadosProntos ? 'Tudo pronto!' : 'Finalizando…';
  return (
    <div className="abertura" role="status" aria-live="polite">
      <div className="abertura-logo"><Logo tam={96} /><span className="onda" /><span className="onda o2" /></div>
      <div className="abertura-nome">IO TECNOLOGIA</div>
      <div className="abertura-sub">Fênix · Gestão da Fundição</div>
      <div className="abertura-ola">{saud}, {nome}!</div>
      <div className="abertura-barra"><span style={{ width: `${rapida ? (dadosProntos ? 100 : 60) : Math.min(100, (i / passos.length) * 100)}%` }} /></div>
      <div className="abertura-msg">{msg}</div>
    </div>
  );
}
