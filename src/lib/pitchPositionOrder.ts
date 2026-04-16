/**
 * Left-to-right order on the pitch for the team sheet view (own goal at bottom,
 * attacking up). Lower rank = further left on screen for the viewer.
 */
export function horizontalRank(posAbbr: string): number {
  const p = posAbbr.toUpperCase();

  if (p === 'GK') return 2;

  // Left flank / left channel
  if (p === 'LB' || p === 'LWB' || p === 'LW' || p === 'LF' || p === 'LM') return 0;
  if (p === 'LCB' || p === 'LCM' || p === 'LAM' || p === 'LCF') return 1;

  // Right flank / right channel
  if (p === 'RB' || p === 'RWB' || p === 'RW' || p === 'RF' || p === 'RM') return 4;
  if (p === 'RCB' || p === 'RCM' || p === 'RAM' || p === 'RCF') return 3;

  // Centre / unspecified — keep relative order via stable sort
  return 2;
}
