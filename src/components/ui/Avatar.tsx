import { iniciais } from '@/lib/format';
import { buscarFotoColaborador } from '@/lib/fotosColaboradores';
import clsx from 'clsx';

const CORES = ['from-indigo-500 to-violet-600', 'from-sky-500 to-blue-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600', 'from-pink-500 to-rose-600'];

function corPorNome(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = (hash + nome.charCodeAt(i)) % CORES.length;
  return CORES[hash];
}

/** Foto real quando a operação já mandou (ver fotosColaboradores.ts); senão cai na bolinha
 * de iniciais com cor determinística por nome, como sempre foi. */
export function Avatar({ nome, size = 36 }: { nome: string; size?: number }) {
  const foto = buscarFotoColaborador(nome);

  if (foto) {
    return (
      <img
        src={foto}
        alt={nome}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={clsx('flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white font-semibold', corPorNome(nome))}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {iniciais(nome)}
    </div>
  );
}
