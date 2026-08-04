import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, X, Check, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { useAuth, type ContaSalva } from '@/context/AuthContext';
import { iniciais } from '@/lib/format';

type Modo = 'contas' | 'login' | 'login-rapido' | 'cadastro';

const inputClasse =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-shadow focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const labelClasse = 'block text-[12px] font-medium text-slate-600 mb-1';
const botaoPrimario =
  'w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-emerald-500 hover:opacity-95 disabled:opacity-60 text-white text-[14px] font-semibold py-3 transition-opacity';

/** "kleber.ribeiro@madmbrasil.com.br" -> "kl***@madmbrasil.c..." — só o suficiente pra pessoa reconhecer a própria conta. */
function mascararEmail(email: string): string {
  const [local, dominio] = email.split('@');
  if (!local || !dominio) return email;
  return `${local.slice(0, 2)}***@${dominio.slice(0, 12)}...`;
}

function CampoSenha({
  id,
  value,
  onChange,
  autoComplete,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  autoFocus?: boolean;
}) {
  const [mostrar, setMostrar] = useState(false);
  return (
    <div className="relative">
      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        id={id}
        type={mostrar ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        placeholder="Digite sua senha"
        className={clsx(inputClasse, 'pl-9 pr-9')}
        minLength={6}
        required
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setMostrar((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500"
      >
        {mostrar ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function AlternadorModo({ modo, onEscolher }: { modo: 'login' | 'cadastro'; onEscolher: (m: 'login' | 'cadastro') => void }) {
  return (
    <div className="flex p-1 rounded-lg bg-slate-100 mb-5">
      <button
        type="button"
        onClick={() => onEscolher('login')}
        className={clsx(
          'flex-1 rounded-md py-2 text-[13px] font-semibold transition-colors',
          modo === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
        )}
      >
        Entrar
      </button>
      <button
        type="button"
        onClick={() => onEscolher('cadastro')}
        className={clsx(
          'flex-1 rounded-md py-2 text-[13px] font-semibold transition-colors',
          modo === 'cadastro' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
        )}
      >
        Criar conta
      </button>
    </div>
  );
}

export default function Login() {
  const { login, registrar, contasSalvas, removerContaSalva } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [modo, setModo] = useState<Modo>(contasSalvas.length > 0 ? 'login-rapido' : 'login');
  const [contaSelecionada, setContaSelecionada] = useState<ContaSalva | null>(contasSalvas[0] ?? null);

  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const senhasConferem: boolean | null = confirmarSenha.length === 0 ? null : senha === confirmarSenha;

  function irParaDestino() {
    const destino = (location.state as { from?: string } | null)?.from ?? '/';
    navigate(destino, { replace: true });
  }

  function selecionarConta(conta: ContaSalva) {
    setContaSelecionada(conta);
    setSenha('');
    setErro(null);
    setModo('login-rapido');
  }

  function trocarModo(novoModo: 'login' | 'cadastro') {
    setModo(novoModo);
    setErro(null);
    setSenha('');
    setConfirmarSenha('');
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const usuarioFinal = modo === 'login-rapido' ? contaSelecionada!.usuario : usuario;
    const resultado = await login(usuarioFinal, senha);
    setEnviando(false);
    if (!resultado.ok) {
      setErro(resultado.error);
      return;
    }
    irParaDestino();
  }

  async function handleCadastro(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senhasConferem === false) {
      setErro('As senhas não coincidem.');
      return;
    }
    setEnviando(true);
    const resultado = await registrar(emailCadastro, senha);
    setEnviando(false);
    if (!resultado.ok) {
      setErro(resultado.error);
      return;
    }
    irParaDestino();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center lg:justify-start bg-[#0b1e3f] bg-cover bg-bottom px-4 lg:pl-[40%] lg:pr-[6vw]"
      style={{ backgroundImage: "url('/image-1784641969150.png')" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-4">
          <img src="/logo-madm.png" alt="MADM Brasil" className="h-24 w-24 object-contain drop-shadow-lg" />
          <p className="mt-1 text-base font-bold tracking-wide text-white drop-shadow">MADM BRASIL</p>
        </div>

        <div className="rounded-2xl bg-white shadow-2xl p-5">

        {modo === 'contas' && (
          <div>
            <div className="flex flex-col gap-3 mb-5">
              {contasSalvas.map((conta) => (
                <div key={conta.usuario} className="group relative w-full">
                  <button
                    type="button"
                    onClick={() => selecionarConta(conta)}
                    className="w-full flex items-center gap-3 rounded-xl bg-white p-3 border border-slate-200 hover:border-blue-300 hover:ring-2 hover:ring-blue-100 transition-all"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[13px] font-semibold text-white shrink-0">
                      {iniciais(conta.nome)}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-[13px] font-bold text-slate-900 uppercase truncate">{conta.nome}</p>
                      <p className="text-[12px] text-slate-500 truncate">{mascararEmail(conta.usuario)}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removerContaSalva(conta.usuario)}
                    title="Remover conta salva"
                    className="absolute -top-2 -right-2 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white border border-white"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-2">
              <button type="button" onClick={() => trocarModo('login')} className="text-[13px] text-blue-600 hover:text-blue-700 hover:underline">
                Entrar com outro usuário
              </button>
              <button type="button" onClick={() => trocarModo('cadastro')} className="text-[12px] text-slate-400 hover:text-slate-600 hover:underline">
                Criar uma conta
              </button>
            </div>
          </div>
        )}

        {modo === 'login-rapido' && contaSelecionada && (
          <>
            <AlternadorModo
              modo="login"
              onEscolher={(m) => {
                if (m === 'cadastro') {
                  trocarModo('cadastro');
                } else {
                  setContaSelecionada(null);
                  trocarModo('login');
                }
              }}
            />

            <form onSubmit={handleLogin} className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-blue-50/70 border border-blue-100 p-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[13px] font-semibold text-white shrink-0">
                  {iniciais(contaSelecionada.nome)}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-900 uppercase truncate">{contaSelecionada.nome}</p>
                  <p className="text-[12px] text-slate-500 truncate">{mascararEmail(contaSelecionada.usuario)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setModo('contas'); setContaSelecionada(null); }}
                  className="ml-auto text-[12px] font-medium text-blue-600 hover:text-blue-700 shrink-0"
                >
                  Trocar
                </button>
              </div>

              <CampoSenha id="senha-rapida" value={senha} onChange={setSenha} autoComplete="current-password" autoFocus />

              {erro && <p className="text-[12px] text-red-600">{erro}</p>}

              <button type="submit" disabled={enviando} className={botaoPrimario}>
                {enviando ? <Loader2 size={16} className="animate-spin" /> : <>Entrar no sistema <ArrowRight size={16} /></>}
              </button>
            </form>
          </>
        )}

        {(modo === 'login' || modo === 'cadastro') && (
          <>
            <AlternadorModo modo={modo} onEscolher={trocarModo} />

            {modo === 'login' && (
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label htmlFor="usuario" className={labelClasse}>Email corporativo</label>
                  <input
                    id="usuario"
                    type="email"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    autoComplete="username"
                    placeholder="nome.sobrenome@madmbrasil.com.br"
                    className={inputClasse}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="senha" className={labelClasse}>Senha</label>
                  <CampoSenha id="senha" value={senha} onChange={setSenha} autoComplete="current-password" />
                </div>

                {erro && <p className="text-[12px] text-red-600">{erro}</p>}

                <button type="submit" disabled={enviando} className={botaoPrimario}>
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <>Entrar no sistema <ArrowRight size={16} /></>}
                </button>
              </form>
            )}

            {modo === 'cadastro' && (
              <form onSubmit={handleCadastro} className="space-y-3">
                <div>
                  <label htmlFor="email-cadastro" className={labelClasse}>Email corporativo</label>
                  <input
                    id="email-cadastro"
                    type="email"
                    value={emailCadastro}
                    onChange={(e) => setEmailCadastro(e.target.value)}
                    autoComplete="username"
                    placeholder="nome.sobrenome@madmbrasil.com.br"
                    className={inputClasse}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="nova-senha" className={labelClasse}>Senha</label>
                  <CampoSenha id="nova-senha" value={senha} onChange={setSenha} autoComplete="new-password" />
                </div>
                <div>
                  <label htmlFor="confirmar-senha" className={labelClasse}>Repetir senha</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="confirmar-senha"
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Repita a senha"
                      className={clsx(
                        inputClasse,
                        'pl-9',
                        senhasConferem === false && 'border-red-400 focus:border-red-400 focus:ring-red-100',
                        senhasConferem === true && 'border-emerald-400 focus:border-emerald-400 focus:ring-emerald-100',
                      )}
                      minLength={6}
                      required
                    />
                  </div>
                  {senhasConferem === false && <p className="mt-1 text-[11px] text-red-600">As senhas não coincidem.</p>}
                  {senhasConferem === true && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
                      <Check size={11} /> As senhas coincidem.
                    </p>
                  )}
                </div>

                {erro && <p className="text-[12px] text-red-600">{erro}</p>}

                <button type="submit" disabled={enviando || senhasConferem === false} className={botaoPrimario}>
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <>Criar conta e entrar <ArrowRight size={16} /></>}
                </button>
              </form>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
