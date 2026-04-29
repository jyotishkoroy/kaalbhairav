"use client";

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

export type BirthProfileCardProps = {
  date?: string;
  time?: string;
  place?: string;
  lagna?: string;
  moonSign?: string;
  nakshatra?: string;
};

export function BirthProfileCard(props: BirthProfileCardProps) {
  const rows = [
    ["Date", props.date],
    ["Time", props.time],
    ["Place", props.place],
    ["Lagna", props.lagna],
    ["Moon sign", props.moonSign],
    ["Nakshatra", props.nakshatra],
  ].filter(([, value]) => Boolean(value));

  if (rows.length === 0) return null;

  return (
    <section
      aria-label="Birth profile"
      className="rounded-xl border border-white/10 bg-white/5 p-3"
    >
      <div className="mb-2 text-sm font-medium">Birth profile</div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label as string} className="flex justify-between gap-3">
            <dt className="opacity-70">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
