import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Bookmark, CalendarDays, Flame, TrendingDown, TrendingUp, Trophy, Users } from 'lucide-react';

export interface ResumoPlanoAcao {
  precisamAtencao: number;
  acimaDaMeta: number;
  semProtocolar: number;
  conversaoBaixa: number;
  conversaoMedia: number;
  mediaDia: number;
  melhorColaborador: string | null;
  protocolosPendentes: number;
}

function CardResumo({ icon: Icon, valor, label, cor }: { icon: LucideIcon; valor: string; label: string; cor: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-4 py-3.5 flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${cor}1a`, color: cor }}>
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold text-slate-900 leading-tight truncate">{valor}</p>
        <p className="text-[11px] text-slate-500 leading-tight truncate">{label}</p>
      </div>
    </div>
  );
}

export function SummaryCards({ resumo }: { resumo: ResumoPlanoAcao }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-5">
      <CardResumo icon={Users} valor={String(resumo.precisamAtencao)} label="Precisam de atenção" cor="#EF4444" />
      <CardResumo icon={Flame} valor={String(resumo.acimaDaMeta)} label="Acima da meta" cor="#22C55E" />
      <CardResumo icon={AlertTriangle} valor={String(resumo.semProtocolar)} label="Sem protocolar" cor="#F59E0B" />
      <CardResumo icon={TrendingDown} valor={String(resumo.conversaoBaixa)} label="Conversão abaixo de 5%" cor="#EF4444" />
      <CardResumo icon={TrendingUp} valor={`${resumo.conversaoMedia.toFixed(1)}%`} label="Conversão média" cor="#4F7CFF" />
      <CardResumo icon={CalendarDays} valor={resumo.mediaDia.toFixed(1)} label="Média/Dia da equipe" cor="#4F7CFF" />
      <CardResumo icon={Trophy} valor={resumo.melhorColaborador ? resumo.melhorColaborador.split(' ')[0] : '—'} label="Melhor colaborador" cor="#F59E0B" />
      <CardResumo icon={Bookmark} valor={String(resumo.protocolosPendentes)} label="Protocolos pendentes" cor="#F59E0B" />
    </div>
  );
}
