import { titleCase } from '@/shared/utils/format';

export const Badge = ({ value, tone = 'neutral' }: { value: string; tone?: string }) => (
  <span className={`badge badge-${tone}`}>{titleCase(value)}</span>
);
