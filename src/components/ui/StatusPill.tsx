import type { NivelStatus } from '@/types/domain';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/format';

export function StatusPill({ status }: { status: NivelStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ color, backgroundColor: `${color}1a`, border: `1px solid ${color}33` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {STATUS_LABEL[status]}
    </span>
  );
}
