// Rotas. Sem login → tela de entrada. Cada página só abre se o perfil do usuário tiver permissão.
import { useCallback, useState, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DadosProvider } from './componentes/Dados';
import { Shell } from './componentes/Shell';
import { Vazio } from './componentes/Comuns';
import { Abertura } from './componentes/Abertura';
import { repoMock } from './repositorio/repo-mock';
import { SessaoProvider, useSessao } from './acesso/Sessao';
import { PAGINAS } from './acesso/paginas';
import { Login } from './telas/Login';
import { VisaoGeral } from './telas/VisaoGeral';
import { Orcamentos } from './telas/Orcamentos';
import { Faturamento } from './telas/Faturamento';
import { Clientes } from './telas/Clientes';
import { OrdensProducao } from './telas/OrdensProducao';
import { FichasForno } from './telas/FichasForno';
import { Rncs } from './telas/Rncs';
import { Certificados } from './telas/Certificados';
import { LigasFornos } from './telas/LigasFornos';
import { Insumos } from './telas/Insumos';
import { Manutencoes } from './telas/Manutencoes';
import { CustoMensal } from './telas/CustoMensal';
import { FolhaPagamento } from './telas/FolhaPagamento';
import { Indicadores } from './telas/Indicadores';
import { Usuarios } from './telas/Usuarios';

const TELAS: Record<string, ReactNode> = {
  visao: <VisaoGeral />, orcamentos: <Orcamentos />, faturamento: <Faturamento />, clientes: <Clientes />, ops: <OrdensProducao />, fichas: <FichasForno />,
  rnc: <Rncs />, certificados: <Certificados />, ligas: <LigasFornos />, insumos: <Insumos />, manutencao: <Manutencoes />, custo: <CustoMensal />,
  folha: <FolhaPagamento />, indicadores: <Indicadores />, usuarios: <Usuarios />,
};

// Já estava logado quando a página abriu (recarregou)? Então a abertura é rápida.
let sessaoAoAbrir = (() => { try { return !!sessionStorage.getItem('iofenix:sessao'); } catch { return false; } })();

function Rotas() {
  const s = useSessao();
  if (!s.usuario) return <Login />;
  return <AreaLogada key={s.usuario.email} />;
}

/** Depois do login: carrega os dados (por baixo) enquanto a tela de abertura roda; no fim, mostra o sistema. */
function AreaLogada() {
  const s = useSessao();
  const [rapida] = useState(() => { const r = sessaoAoAbrir; sessaoAoAbrir = false; return r; });
  const [dados, setDados] = useState(false);
  const [aberto, setAberto] = useState(false);
  const fim = useCallback(() => setAberto(true), []);
  const u = s.usuario!;
  return (
    <>
      <DadosProvider repo={repoMock} aoCarregar={() => setDados(true)}>
        {aberto && <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Telas /></HashRouter>}
      </DadosProvider>
      {!aberto && <Abertura nome={u.nome} perfil={u.perfil} dadosProntos={dados} rapida={rapida} fim={fim} />}
    </>
  );
}

function Telas() {
  const s = useSessao();
  const perfil = s.usuario!.perfil;
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/visao" replace />} />
        {PAGINAS.map((p) => (
          <Route key={p.id} path={p.rota.slice(1)} element={p.perfis.includes(perfil) ? TELAS[p.id] : <Vazio>Seu perfil não tem acesso a “{p.nome}”.</Vazio>} />
        ))}
        <Route path="*" element={<Navigate to="/visao" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <SessaoProvider>
      <Rotas />
    </SessaoProvider>
  );
}
