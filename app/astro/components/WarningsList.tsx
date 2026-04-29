/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

type AstroWarning = {
  warning_code?: string
  severity?: string
  explanation?: string
}

type WarningsListProps = {
  warnings?: AstroWarning[] | null
}

export function WarningsList({ warnings }: WarningsListProps) {
  if (!warnings?.length) {
    return null
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-base font-semibold text-zinc-950">Warnings</h2>
      <ul className="mt-3 space-y-3">
        {warnings.map((warning, index) => (
          <li key={`${warning.warning_code || 'warning'}-${index}`} className="text-sm text-zinc-700">
            <p className="font-medium text-zinc-950">
              {warning.warning_code || 'WARNING'} · {warning.severity || 'unknown'}
            </p>
            {warning.explanation ? <p className="mt-1">{warning.explanation}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
