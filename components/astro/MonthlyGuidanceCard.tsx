"use client";

export type MonthlyGuidanceCardProps = {
  month?: string;
  mainTheme?: string;
  avoid?: string[];
  doMoreOf?: string[];
  remedy?: string;
};

export function MonthlyGuidanceCard({
  month,
  mainTheme,
  avoid = [],
  doMoreOf = [],
  remedy,
}: MonthlyGuidanceCardProps) {
  if (!month && !mainTheme && avoid.length === 0 && doMoreOf.length === 0 && !remedy) {
    return null;
  }

  return (
    <section
      aria-label="Monthly guidance"
      className="rounded-xl border border-white/10 bg-white/5 p-3"
    >
      <div className="text-sm font-medium">
        Monthly guidance{month ? ` · ${month}` : ""}
      </div>
      {mainTheme ? <p className="mt-2 text-sm opacity-90">{mainTheme}</p> : null}
      {doMoreOf.length > 0 ? (
        <div className="mt-2">
          <div className="text-xs font-medium opacity-70">Do more of</div>
          <ul className="mt-1 list-disc pl-5 text-sm opacity-90">
            {doMoreOf.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {avoid.length > 0 ? (
        <div className="mt-2">
          <div className="text-xs font-medium opacity-70">Avoid</div>
          <ul className="mt-1 list-disc pl-5 text-sm opacity-90">
            {avoid.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {remedy ? <p className="mt-2 text-sm opacity-90">Remedy: {remedy}</p> : null}
    </section>
  );
}
