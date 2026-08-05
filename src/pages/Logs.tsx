import { useEffect, useState } from 'react';
import { LogIn, RefreshCw, X, Laptop, Smartphone, Tablet, HelpCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';

interface EventoAuditoria {
  id: string;
  usuario: string;
  tipo: 'login' | 'pagina';
  caminho?: string;
  criadoEm: string;
  ip?: string;
  userAgent?: string;
}

function formatDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}

/** Nome amigável do aparelho a partir do User-Agent (ex: "iPhone", "Samsung", "Notebook Windows"). */
function nomeDispositivo(userAgent?: string): string {
  if (!userAgent) return 'Dispositivo desconhecido';
  if (/iPhone/.test(userAgent)) return 'iPhone';
  if (/iPad/.test(userAgent)) return 'iPad';
  if (/SM-|Samsung/i.test(userAgent)) return 'Celular Samsung';
  if (/Android/.test(userAgent)) return 'Celular Android';
  if (/Macintosh/.test(userAgent)) return 'Mac';
  if (/Windows/.test(userAgent)) return 'Notebook/PC Windows';
  if (/Linux/.test(userAgent)) return 'Computador Linux';
  return 'Dispositivo desconhecido';
}

function navegadorDispositivo(userAgent?: string): string {
  if (!userAgent) return '';
  if (/Edg\//.test(userAgent)) return 'Edge';
  if (/Chrome\//.test(userAgent)) return 'Chrome';
  if (/Firefox\//.test(userAgent)) return 'Firefox';
  if (/Safari\//.test(userAgent)) return 'Safari';
  return 'outro navegador';
}

function IconeDispositivo({ userAgent }: { userAgent?: string }) {
  if (!userAgent) return <HelpCircle size={22} className="text-slate-400" />;
  if (/iPhone|Android|SM-|Samsung/i.test(userAgent)) return <Smartphone size={22} className="text-blue-600" />;
  if (/iPad|Tablet/i.test(userAgent)) return <Tablet size={22} className="text-blue-600" />;
  return <Laptop size={22} className="text-blue-600" />;
}

export default function Logs() {
  const { sessao } = useAuth();
  const [eventos, setEventos] = useState<EventoAuditoria[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoAuditoria | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch('/api/logs', {
        headers: { Authorization: `Bearer ${sessao?.token}` },
      });
      const dados = await resposta.json();
      if (!resposta.ok || !dados.ok) {
        setErro(dados.error ?? 'Não foi possível carregar os registros.');
        return;
      }
      setEventos(dados.eventos);
    } catch {
      setErro('Erro de conexão ao carregar os registros.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logins = eventos?.filter((e) => e.tipo === 'login') ?? [];

  return (
    <div>
      <PageHeader
        title="Logs de Acesso"
        description="Governança: quem entrou no dashboard e quando. Visível apenas para usuários master."
        actions={
          <button
            onClick={carregar}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
          >
            <RefreshCw size={13} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
        }
      />

      {erro && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{erro}</p>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <LogIn size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-700">Logins recentes</h3>
        </div>
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200 sticky top-0 bg-white">
                <th className="py-2 pr-4 font-medium">Usuário</th>
                <th className="py-2 pr-4 font-medium">Data/Hora</th>
              </tr>
            </thead>
            <tbody>
              {logins.length === 0 && !carregando && (
                <tr>
                  <td colSpan={2} className="py-4 text-slate-500">Nenhum login registrado ainda.</td>
                </tr>
              )}
              {logins.map((e) => (
                <tr key={e.id} className="border-b border-slate-200/60">
                  <td className="py-2 pr-4">
                    <button
                      type="button"
                      onClick={() => setEventoSelecionado(e)}
                      className="rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 px-3 py-1.5 text-slate-700 font-medium transition-colors"
                    >
                      {e.usuario}
                    </button>
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{formatDataHora(e.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {eventoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" onClick={() => setEventoSelecionado(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">{eventoSelecionado.usuario}</h3>
              <button type="button" onClick={() => setEventoSelecionado(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-slate-500">Data/Hora</p>
                <p className="text-[13px] font-medium text-slate-900">{formatDataHora(eventoSelecionado.criadoEm)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">IP</p>
                <p className="text-[13px] font-medium text-slate-900">{eventoSelecionado.ip ?? 'Não capturado'}</p>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3 mt-4">
                <IconeDispositivo userAgent={eventoSelecionado.userAgent} />
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500">Dispositivo</p>
                  <p className="text-[13px] font-semibold text-slate-900">{nomeDispositivo(eventoSelecionado.userAgent)}</p>
                  {eventoSelecionado.userAgent && (
                    <p className="text-[11px] text-slate-500">{navegadorDispositivo(eventoSelecionado.userAgent)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
