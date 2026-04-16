import { Sparkles } from 'lucide-react';

interface EarlyAdopterBadgeProps {
  className?: string;
}

export default function EarlyAdopterBadge({ className = '' }: EarlyAdopterBadgeProps) {
  return (
    <span className={`early-adopter-badge ${className}`.trim()} aria-label="Badge: Early Adopter">
      <Sparkles size={14} aria-hidden />
      <span>Early Adopter</span>
    </span>
  );
}
