export const TEAM_OPTIONS = [
  'manchester-united',
  'liverpool',
  'arsenal',
  'chelsea',
  'manchester-city',
  'tottenham',
  'barcelona',
  'real-madrid',
  'bayern-munich',
  'juventus',
] as const;

export type TeamOption = (typeof TEAM_OPTIONS)[number];
