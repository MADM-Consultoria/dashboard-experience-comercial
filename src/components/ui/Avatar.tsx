import { iniciais } from '@/lib/format';
import clsx from 'clsx';

const CORES = ['from-indigo-500 to-violet-600', 'from-sky-500 to-blue-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600', 'from-pink-500 to-rose-600'];

function corPorNome(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = (hash + nome.charCodeAt(i)) % CORES.length;
  return CORES[hash];
}

export function Avatar({ nome, size = 36 }: { nome: string; size?: number }) {
  return (
    <div
      className={clsx('flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white font-semibold', corPorNome(nome))}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {iniciais(nome)}
    </div>
  );
}
