import { LayoutDashboard, Trophy, Users, AlertTriangle, type LucideIcon } from 'lucide-react';

export interface ItemNav {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const ITENS_PRINCIPAIS: ItemNav[] = [
  { to: '/', label: 'Visão Geral', icon: LayoutDashboard, end: true },
  { to: '/ranking', label: 'Ranking', icon: Trophy },
  { to: '/equipe', label: 'Equipe', icon: Users },
  { to: '/gargalos', label: 'Gargalos', icon: AlertTriangle },
];

/** Configurações e Logs de Acesso saíram do menu lateral — agora só ficam
 * acessíveis pelo menu do ícone de usuário (src/components/layout/UserMenu.tsx). */
export function montarItensNav(_ehMaster: boolean): ItemNav[] {
  return ITENS_PRINCIPAIS;
}
