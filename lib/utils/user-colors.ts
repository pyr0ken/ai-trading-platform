export interface UserColorStyle {
  bg: string;
  border: string;
  text: string;
  dot: string;
  badgeClass: string;
  avatarBg: string;
}

const PALETTE: UserColorStyle[] = [
  {
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-500/50',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    badgeClass: 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400',
    avatarBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]',
  },
  {
    bg: 'bg-purple-950/60',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    dot: 'bg-purple-400',
    badgeClass: 'bg-purple-950/60 border-purple-500/50 text-purple-400',
    avatarBg: 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.25)]',
  },
  {
    bg: 'bg-cyan-950/60',
    border: 'border-cyan-500/50',
    text: 'text-cyan-400',
    dot: 'bg-cyan-400',
    badgeClass: 'bg-cyan-950/60 border-cyan-500/50 text-cyan-400',
    avatarBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]',
  },
  {
    bg: 'bg-amber-950/60',
    border: 'border-amber-500/50',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    badgeClass: 'bg-amber-950/60 border-amber-500/50 text-amber-400',
    avatarBg: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]',
  },
  {
    bg: 'bg-rose-950/60',
    border: 'border-rose-500/50',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
    badgeClass: 'bg-rose-950/60 border-rose-500/50 text-rose-400',
    avatarBg: 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.25)]',
  },
  {
    bg: 'bg-indigo-950/60',
    border: 'border-indigo-500/50',
    text: 'text-indigo-400',
    dot: 'bg-indigo-400',
    badgeClass: 'bg-indigo-950/60 border-indigo-500/50 text-indigo-400',
    avatarBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.25)]',
  },
  {
    bg: 'bg-orange-950/60',
    border: 'border-orange-500/50',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
    badgeClass: 'bg-orange-950/60 border-orange-500/50 text-orange-400',
    avatarBg: 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.25)]',
  },
  {
    bg: 'bg-teal-950/60',
    border: 'border-teal-500/50',
    text: 'text-teal-400',
    dot: 'bg-teal-400',
    badgeClass: 'bg-teal-950/60 border-teal-500/50 text-teal-400',
    avatarBg: 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-[0_0_10px_rgba(20,184,166,0.25)]',
  },
];

export function getUserColor(username?: string): UserColorStyle {
  if (!username) return PALETTE[3]; // default amber

  const clean = username.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
