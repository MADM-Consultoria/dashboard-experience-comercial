import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Database, Moon, Percent, ShieldAlert, Sun, Users } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

interface StatusCache {
  ok: boolean;
  atualizadoEm: string;
  janela: { inicio: string; fim: string };
  ultimoErro?: string;
}

/** Formata "há quanto tempo" em português, sem depender de biblioteca externa. */
function formatarHaQuanto(iso: string): string {
  const segundos = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (segundos < 60) return `há ${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `há ${horas}h`;
}

/** Busca e mostra quando o cache central de dados do dashboard (ver `dashboardCache.ts` no
 * backend) foi atualizado pela última vez — é como dá pra confirmar, direto na tela, se o cron
 * que alimenta o dashboard está rodando de verdade, sem precisar olhar log da Vercel. */
function useStatusCache(sessao: ReturnType<typeof useAuth>['sessao']) {
  const [status, setStatus] = useState<StatusCache | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!sessao) return;
    let cancelado = false;
    setCarregando(true);
    fetch('/api/cache-status', { headers: { Authorization: `Bearer ${sessao.token}` } })
      .then((r) => r.json())
      .then((dados) => {
        if (!cancelado) setStatus(dados);
      })
      .catch(() => {
        if (!cancelado) setStatus(null);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [sessao]);

  return { status, carregando };
}

export default function Configuracoes() {
  const { tema, alternarTema } = useTheme();
  const { sessao } = useAuth();
  const escuro = tema === 'dark';
  const { status, carregando } = useStatusCache(sessao);

  return (
    <div>
      <PageHeader title="Configurações" description="Parâmetros da plataforma e preferências pessoais." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              {escuro ? <Moon size={16} /> : <Sun size={16} />}
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Aparência</h3>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3">
            <div>
              <p className="text-[13px] text-slate-700 dark:text-slate-200 font-medium">Modo escuro</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Deixa o dashboard com fundo escuro, mais confortável à noite.</p>
            </div>
            <button
              onClick={alternarTema}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${escuro ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow transition-transform ${escuro ? 'translate-x-5' : 'translate-x-0'}`}
                style={{ backgroundColor: '#ffffff' }}
              />
            </button>
          </div>
        </Card>

        {sessao?.role === 'master' && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500"><ShieldAlert size={16} /></div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Logs de acesso</h3>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
              <p className="text-[13px] text-slate-600 dark:text-slate-300 mb-3">Veja quem entrou no dashboard e quando, disponível só pra administradores.</p>
              <Link
                to="/logs"
                className="inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Ver logs de acesso
              </Link>
            </div>
          </Card>
        )}

        {sessao?.role === 'master' && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600"><Database size={16} /></div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Fonte de dados</h3>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
              <p className="text-[13px] text-slate-600 dark:text-slate-300 mb-1">Cache do dashboard</p>
              {carregando ? (
                <span className="text-xs text-slate-400">Verificando...</span>
              ) : status?.atualizadoEm ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span
                        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${status.ultimoErro ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      />
                      <span className={`relative inline-flex h-2 w-2 rounded-full ${status.ultimoErro ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    </span>
                    <span className={`text-xs font-medium ${status.ultimoErro ? 'text-amber-500' : 'text-emerald-500'}`}>
                      Atualizado {formatarHaQuanto(status.atualizadoEm)}
                    </span>
                  </div>
                  {status.ultimoErro && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">
                      A última tentativa de atualizar falhou ({status.ultimoErro}) — os dados acima são do último cache válido.
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                  <span className="text-xs text-red-500 font-medium">
                    {status?.ultimoErro ?? 'Ainda não inicializado'}
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400"><Percent size={16} /></div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Limiares de alerta</h3>
          </div>
          <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3">
              <span className="text-slate-600 dark:text-slate-300">Taxa de Protocolados mínima</span>
              <span className="text-slate-900 dark:text-slate-100 font-semibold">60%</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3">
              <span className="text-slate-600 dark:text-slate-300">Atingimento mínimo de meta</span>
              <span className="text-slate-900 dark:text-slate-100 font-semibold">70%</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3">
              <span className="text-slate-600 dark:text-slate-300">Queda de produtividade crítica</span>
              <span className="text-slate-900 dark:text-slate-100 font-semibold">15%</span>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400"><Users size={16} /></div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Equipe cadastrada</h3>
          </div>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">O cadastro de colaboradores (nome, cargo, time, metas) é sincronizado a partir da view real do banco.</p>
        </Card>
      </div>
    </div>
  );
}
