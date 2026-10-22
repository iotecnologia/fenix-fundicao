// Tela de entrada (mesmo layout do Analiza / IO Clinic): marca à esquerda, formulário à direita.
// E-mail + senha individual, conferida por hash; 5 erros seguidos bloqueiam por 30 s.
import { useState, type FormEvent } from 'react';
import { useSessao } from '../acesso/Sessao';
import { Icone } from '../componentes/Icone';
import { Logo } from '../componentes/Marca';
import empresa from '../dados/empresa.json';

export function Login() {
  const s = useSessao();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [conferindo, setConferindo] = useState(false);
  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha) { setErro('Informe o e-mail e a senha.'); return; }
    setConferindo(true); setErro('');
    const r = await s.entrar(email, senha);
    setConferindo(false);
    if (!r.ok) { setErro(r.motivo); setSenha(''); }
  };
  return (
    <div className="login">
      <div className="login-marca">
        <div className="deco" />
        <div className="logo-bloco"><Logo tam={46} /><div><b>IO TECNOLOGIA</b><small>{empresa.nome} · {empresa.cidade.split('·')[0].trim()}</small></div></div>
        <h1>A fundição inteira em um só lugar, <em>do orçamento ao certificado.</em></h1>
        <p>Orçamento com margem pelo custo real do kg, ordem de produção, ficha do forno com baixa automática dos insumos, refugo, certificado de qualidade e o custo mensal fechando sozinho.</p>
        <div className="modulos-lista">
          <span><Icone n="orcamento" /> Orçamento e faturamento</span>
          <span><Icone n="fogo" /> Corridas e ordens de produção</span>
          <span><Icone n="escudo" /> RNC e certificados</span>
          <span><Icone n="grafico" /> Custo por kg e indicadores</span>
        </div>
        <div className="rod">IO Tecnologia · sistema de gestão {empresa.fantasia}</div>
      </div>
      <div className="login-form">
        <form className="form-caixa" onSubmit={entrar}>
          <h2>Entrar</h2>
          <p className="sub">Use o seu e-mail da empresa e a sua senha.</p>
          <label className="campo">E-mail
            <div className="inp"><Icone n="medico" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.email@empresa.com.br" autoComplete="username" /></div>
          </label>
          <label className="campo">Senha
            <div className="inp"><Icone n="chave" />
              <input type={verSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
              <button type="button" className="olho" onClick={() => setVerSenha(!verSenha)} title={verSenha ? 'Esconder senha' : 'Mostrar senha'} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}><Icone n={verSenha ? 'olhoFechado' : 'olho'} /></button>
            </div>
          </label>
          {erro && <div className="erro-login">{erro}</div>}
          <button type="submit" className="btn-entrar" disabled={conferindo}>{conferindo ? 'Conferindo…' : 'Entrar'}</button>
          <div className="seg"><Icone n="escudo" /> Acesso com senha individual. Cada perfil vê só as telas do seu setor.</div>
        </form>
      </div>
    </div>
  );
}
