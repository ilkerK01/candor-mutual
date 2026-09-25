export const shorten = (value: string, head = 10, tail = 6) =>
  value.length > head + tail + 3 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;

export const scrollToId = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export type Notice = { kind: 'ok' | 'err'; text: string } | null;

const friendly: [RegExp, string][] = [
  [/already picked this person/, 'You already picked this person. Each pick counts once.'],
  [/cannot pick yourself/, 'You cannot pick yourself.'],
  [/not valid or was already used/, 'This invite code is not valid or someone already used it. Ask the host for a fresh one.'],
  [/already in this group/, 'You are already a member of this group.'],
  [/round is closed|round is already closed/, 'This round is closed. Picks and joins are no longer accepted.'],
  [/not joined this group|not a member of this group/, 'Join the group with an invite code before picking someone.'],
  [/only the group host/, 'Only the host who created this group can do that.'],
  [/rejected|denied|cancel/i, 'The transaction was cancelled in Lace.'],
];

export const errorText = (e: unknown) => {
  const raw = e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e);
  return friendly.find(([re]) => re.test(raw))?.[1] ?? raw;
};

export const describeError = (e: unknown) => {
  const chain: string[] = [];
  let cause: unknown = e;
  while (cause) {
    chain.push(cause instanceof Error ? cause.message : JSON.stringify(cause));
    cause = cause instanceof Error ? cause.cause : undefined;
  }
  const all = chain.join(' ');
  if (/Wallet\.Proving|Failed to prove transaction/.test(all))
    return 'Lace could not prove the fee. In Lace open Settings → Midnight, choose Proof Server: Local (http://localhost:6300), save, and try again.';
  if (/Insufficient|not enough|dust/i.test(all) && /balance|fee|funds/i.test(all))
    return 'Not enough tDUST to pay the fee. Wait for your tDUST to refill in Lace and try again.';
  return errorText(all);
};

export function Sprite() {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <symbol id="i-key" viewBox="0 0 24 24" {...s}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3M14 9l2 2" /></symbol>
      <symbol id="i-star" viewBox="0 0 24 24" {...s}><path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4l-5.5 2.9 1-6.2L3 9.7l6.2-.9L12 3Z" /></symbol>
      <symbol id="i-plus" viewBox="0 0 24 24" {...s}><rect x="3" y="3" width="18" height="18" rx="6" /><path d="M12 8v8M8 12h8" /></symbol>
      <symbol id="i-chart" viewBox="0 0 24 24" {...s}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></symbol>
      <symbol id="i-lock" viewBox="0 0 24 24" {...s}><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></symbol>
      <symbol id="i-once" viewBox="0 0 24 24" {...s}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0M15 16l2 2 4-4" /></symbol>
      <symbol id="i-eye" viewBox="0 0 24 24" {...s}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></symbol>
      <symbol id="i-shield" viewBox="0 0 24 24" {...s}><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></symbol>
      <symbol id="i-moon" viewBox="0 0 24 24" {...s}><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z" /></symbol>
      <symbol id="i-chat" viewBox="0 0 24 24" {...s}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" /></symbol>
      <symbol id="i-cube" viewBox="0 0 24 24" {...s}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M12 12l8-4.5M12 12v9M12 12 4 7.5" /></symbol>
      <symbol id="i-check" viewBox="0 0 24 24" {...s} strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></symbol>
      <symbol id="i-x" viewBox="0 0 24 24" {...s} strokeWidth={1.8}><path d="M6 6l12 12M18 6 6 18" /></symbol>
      <symbol id="i-copy" viewBox="0 0 24 24" {...s}><rect x="8" y="8" width="12" height="12" rx="3" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></symbol>
      <symbol id="i-user" viewBox="0 0 24 24" {...s}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></symbol>
      <symbol id="i-users" viewBox="0 0 24 24" {...s}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></symbol>
      <symbol id="i-heart" viewBox="0 0 24 24" {...s}><path d="M12 20s-7.5-4.6-9.2-9.4C1.6 7.2 3.8 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.4 0 5.6 3.2 4.4 6.6C19.5 15.4 12 20 12 20Z" /></symbol>
      <symbol id="i-spark" viewBox="0 0 24 24" {...s}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></symbol>
      <symbol id="i-board" viewBox="0 0 24 24" {...s}><rect x="3" y="4" width="18" height="13" rx="3" /><path d="M8 21h8M12 17v4M7 9h6M7 12h10" /></symbol>
      <symbol id="i-mark" viewBox="0 0 200 160"><path d="M30 30 H170 A12 12 0 0 1 182 42 V118 A12 12 0 0 1 170 130 H30 A12 12 0 0 1 18 118 V42 A12 12 0 0 1 30 30 Z M22 36 L84 82 M178 36 L116 82" fill="none" stroke="currentColor" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" /><path d="M128.77 88.00 L129.02 88.76 L129.20 89.53 L129.32 90.31 L129.35 91.09 L129.31 91.86 L129.18 92.62 L128.98 93.37 L128.69 94.10 L128.34 94.80 L127.93 95.48 L127.47 96.14 L126.97 96.76 L126.44 97.36 L125.89 97.94 L125.34 98.49 L124.79 99.04 L124.25 99.57 L123.73 100.09 L123.24 100.62 L122.77 101.15 L122.33 101.69 L121.92 102.23 L121.53 102.80 L121.15 103.37 L120.79 103.95 L120.43 104.55 L120.08 105.15 L119.71 105.75 L119.34 106.35 L118.94 106.94 L118.53 107.52 L118.09 108.09 L117.62 108.63 L117.13 109.15 L116.61 109.64 L116.06 110.11 L115.50 110.55 L114.91 110.96 L114.31 111.34 L113.68 111.70 L113.05 112.04 L112.41 112.36 L111.76 112.65 L111.10 112.93 L110.44 113.20 L109.77 113.44 L109.09 113.67 L108.41 113.88 L107.72 114.07 L107.03 114.23 L106.33 114.37 L105.63 114.47 L104.92 114.54 L104.21 114.57 L103.50 114.56 L102.79 114.51 L102.08 114.42 L101.38 114.29 L100.68 114.13 L100.00 113.93 L99.33 113.72 L98.66 113.48 L98.01 113.24 L97.37 113.00 L96.74 112.76 L96.11 112.54 L95.49 112.35 L94.86 112.18 L94.23 112.04 L93.58 111.94 L92.93 111.87 L92.26 111.83 L91.56 111.82 L90.85 111.83 L90.12 111.85 L89.37 111.87 L88.61 111.88 L87.84 111.87 L87.06 111.82 L86.29 111.74 L85.53 111.61 L84.79 111.42 L84.07 111.17 L83.39 110.86 L82.75 110.48 L82.15 110.04 L81.60 109.54 L81.11 108.98 L80.66 108.38 L80.26 107.74 L79.91 107.07 L79.59 106.38 L79.31 105.67 L79.05 104.96 L78.81 104.26 L78.57 103.57 L78.34 102.89 L78.09 102.23 L77.83 101.59 L77.55 100.96 L77.25 100.35 L76.92 99.76 L76.57 99.18 L76.19 98.60 L75.80 98.02 L75.40 97.44 L74.99 96.86 L74.58 96.26 L74.17 95.65 L73.79 95.02 L73.42 94.38 L73.08 93.72 L72.77 93.05 L72.50 92.36 L72.27 91.65 L72.07 90.94 L71.91 90.21 L71.79 89.48 L71.70 88.74 L71.65 88.00 L71.62 87.26 L71.62 86.51 L71.65 85.77 L71.69 85.02 L71.76 84.28 L71.85 83.54 L71.97 82.80 L72.10 82.07 L72.27 81.34 L72.46 80.62 L72.69 79.91 L72.95 79.21 L73.24 78.52 L73.58 77.86 L73.95 77.21 L74.37 76.59 L74.82 75.99 L75.31 75.42 L75.82 74.87 L76.36 74.35 L76.92 73.86 L77.50 73.39 L78.07 72.93 L78.65 72.49 L79.22 72.05 L79.77 71.62 L80.30 71.18 L80.81 70.72 L81.30 70.26 L81.77 69.77 L82.21 69.25 L82.63 68.71 L83.04 68.15 L83.45 67.56 L83.85 66.96 L84.26 66.34 L84.69 65.72 L85.13 65.10 L85.60 64.51 L86.10 63.93 L86.64 63.40 L87.22 62.91 L87.83 62.48 L88.47 62.11 L89.15 61.81 L89.86 61.58 L90.59 61.42 L91.34 61.34 L92.10 61.33 L92.87 61.37 L93.63 61.47 L94.39 61.62 L95.14 61.80 L95.88 61.99 L96.60 62.20 L97.31 62.41 L98.00 62.61 L98.68 62.78 L99.34 62.94 L100.00 63.06 L100.65 63.15 L101.30 63.21 L101.95 63.24 L102.60 63.25 L103.26 63.23 L103.93 63.20 L104.60 63.16 L105.29 63.13 L105.98 63.10 L106.67 63.09 L107.37 63.10 L108.08 63.14 L108.78 63.21 L109.48 63.31 L110.17 63.45 L110.85 63.62 L111.53 63.83 L112.19 64.07 L112.85 64.33 L113.50 64.62 L114.13 64.94 L114.76 65.27 L115.38 65.62 L115.99 65.99 L116.59 66.37 L117.19 66.77 L117.77 67.19 L118.35 67.62 L118.91 68.07 L119.45 68.55 L119.98 69.04 L120.48 69.56 L120.95 70.11 L121.39 70.68 L121.80 71.27 L122.18 71.89 L122.51 72.53 L122.81 73.19 L123.08 73.86 L123.31 74.54 L123.52 75.23 L123.70 75.92 L123.87 76.62 L124.03 77.30 L124.19 77.98 L124.36 78.65 L124.54 79.31 L124.75 79.96 L124.98 80.60 L125.25 81.24 L125.54 81.87 L125.87 82.50 L126.22 83.14 L126.59 83.79 L126.98 84.45 L127.38 85.12 L127.76 85.81 L128.13 86.53 L128.47 87.25 Z" fill="var(--red)" /></symbol>
    </svg>
  );
}

export const Ico = ({ id, className }: { id: string; className?: string }) => (
  <svg className={className} aria-hidden="true">
    <use href={`#${id}`} />
  </svg>
);
