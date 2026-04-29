"use client";

export type RemedyCardProps = {
  title?: string;
  instructions?: string[];
  safetyNote?: string;
};

export function RemedyCard({
  title = "Safe remedy",
  instructions = [],
  safetyNote,
}: RemedyCardProps) {
  if (instructions.length === 0 && !safetyNote) return null;

  return (
    <section
      aria-label="Safe remedy"
      className="rounded-xl border border-white/10 bg-white/5 p-3"
    >
      <div className="text-sm font-medium">{title}</div>
      {instructions.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-sm opacity-90">
          {instructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ul>
      ) : null}
      {safetyNote ? (
        <p className="mt-2 text-xs opacity-75">Safety note: {safetyNote}</p>
      ) : null}
    </section>
  );
}
