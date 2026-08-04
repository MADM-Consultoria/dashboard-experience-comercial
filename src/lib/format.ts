import { AlertOctagon, AlertTriangle, Medal, Star, Trophy, type LucideIcon } from 'lucide-react';
import type { Medalha, NivelPrioridadeAlerta, NivelStatus } from '@/types/domain';

export function formatNumero(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(valor));
}

export function formatPct(valor: number, casasDecimais = 1): string {
  return `${valor.toFixed(casasDecimais)}%`;
}

export function formatData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano.slice(2)}`;
}

export const STATUS_COLOR: Record<NivelStatus, string> = {
  excelente: 'var(--color-success)',
  bom: 'var(--color-info)',
  atencao: 'var(--color-warning)',
  alerta: 'var(--color-orange)',
  critico: 'var(--color-danger)',
};

export const STATUS_LABEL: Record<NivelStatus, string> = {
  excelente: 'Excelente',
  bom: 'Bom',
  atencao: 'Atenção',
  alerta: 'Alerta',
  critico: 'Crítico',
};

export const PRIORIDADE_LABEL: Record<NivelPrioridadeAlerta, string> = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Médio',
};

export const PRIORIDADE_COLOR: Record<NivelPrioridadeAlerta, string> = {
  critico: 'var(--color-danger)',
  alto: 'var(--color-orange)',
  medio: 'var(--color-warning)',
};

export const MEDALHA_LABEL: Record<Medalha, string> = {
  ouro: 'Ouro',
  prata: 'Prata',
  bronze: 'Bronze',
  destaque: 'Destaque',
  atencao: 'Em atenção',
  critico: 'Crítico',
};

export const MEDALHA_ICON: Record<Medalha, LucideIcon> = {
  ouro: Trophy,
  prata: Medal,
  bronze: Medal,
  destaque: Star,
  atencao: AlertTriangle,
  critico: AlertOctagon,
};

export const MEDALHA_COR: Record<Medalha, string> = {
  ouro: '#f59e0b',
  prata: '#94a3b8',
  bronze: '#c2703d',
  destaque: '#2563eb',
  atencao: '#f97316',
  critico: '#ef4444',
};

/**
 * Classificação Operacional na planilha vem com variação de gênero ("Discador"
 * para homens, "Discadora" para mulheres) — na UI mostramos só "Discadora"
 * (canal, não cargo pessoal) pra quem não é Judit, evitando a impressão de
 * que são 3 categorias distintas.
 */
export function formatCargo(cargo: string): string {
  return cargo.toLowerCase().includes('judit') ? 'Judit' : 'Discadora';
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[partes.length - 1]?.[0] ?? '')).toUpperCase();
}
