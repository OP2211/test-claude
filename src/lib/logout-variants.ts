/** Fun pitch-side copy for the sign-out confirmation — one pair picked at random. */
export const LOGOUT_CONFIRM_VARIANTS = [
  {
    title: 'Leave the ground?',
    message:
      'You’ll step off the pitch and end your matchday session. Head for the tunnel anyway?',
  },
  {
    title: 'Full time already?',
    message:
      'The whistle’s still in the ref’s pocket—but you’re walking off. Sure you want the tunnel?',
  },
  {
    title: 'Subbing yourself off?',
    message:
      'Tactical withdrawal or just grabbing water? Either way, your session ends here. Confirm?',
  },
  {
    title: 'Red card for your session?',
    message:
      'You’re about to take the long walk. The stands will feel quieter—still march off?',
  },
  {
    title: 'Halftime oranges?',
    message:
      'Stretch, snack, and come back refreshed—or call it a day and let someone else take the corner.',
  },
  {
    title: 'Injury time?',
    message:
      'One last minute on the clock. Log out and leave the pitch, or stay for extra time?',
  },
  {
    title: 'The away end awaits?',
    message:
      'Long walk, loud songs, cold bus. End your FanGround matchday and head for the exit?',
  },
  {
    title: 'Stadium lights dimming?',
    message:
      'Flip off the floodlights on this session—or stay under the glow for another chant?',
  },
  {
    title: 'VAR check: you leaving?',
    message:
      'After review, the decision is yours—offsides from the app or back on the pitch?',
  },
  {
    title: 'Pie, pint, or peace out?',
    message:
      'The concession queue can wait—or maybe you’re done cheering for today. Sign out for real?',
  },
] as const;

export function pickRandomLogoutVariant(): { title: string; message: string } {
  const i = Math.floor(Math.random() * LOGOUT_CONFIRM_VARIANTS.length);
  return LOGOUT_CONFIRM_VARIANTS[i]!;
}
