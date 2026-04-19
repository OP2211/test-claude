import { Sparkles } from 'lucide-react';

interface EarlyAdopterBadgeProps {
  className?: string;
  /** Only the first qualifying supporters (see `/badges`) receive this badge in product UI. */
  eligible: boolean;
}

export default function EarlyAdopterBadge({ className = '', eligible }: EarlyAdopterBadgeProps) {
  if (!eligible) return null;
  return (
    <span className={`early-adopter-badge ${className}`.trim()} aria-label="Badge: Early Adopter">
      <Sparkles size={14} aria-hidden />
      <span>Early Adopter</span>
    </span>
  );
}
