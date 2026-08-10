import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Opcional — algumas telas (ex: Visão Geral) omitem, já que o nome já aparece na aba/menu lateral. */
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        {title && <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h1>}
        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
