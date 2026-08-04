import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Database, Moon, Percent, ShieldAlert, Sun, Users } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function Configuracoes() {
  const { tema, alternarTema } = useTheme();
  const { sessao } = useAuth();
  const escuro = tema === 'dark';

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
              <p className="text-[13px] text-slate-600 dark:text-slate-300 mb-1">Banco de dados MADM</p>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-xs text-emerald-500 font-medium">Conectado</span>
              </div>
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
