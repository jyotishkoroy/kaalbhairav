type CalculationStatusProps = {
  status?: string | null
}

export function CalculationStatus({ status }: CalculationStatusProps) {
  const safeStatus = status || 'unknown'

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Calculation status: {safeStatus}</p>
      {safeStatus === 'stub' ? (
        <p className="mt-2">
          V1 stub mode is active. The backend has created a safe chart container and prediction context, but real planetary positions, houses, dashas, and transits are not calculated yet.
        </p>
      ) : null}
    </div>
  )
}
