/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export function calculateMeanObliquityDeg(jdUtExact: number): number {
  if (!Number.isFinite(jdUtExact)) {
    throw new Error('jdUtExact must be a finite number.')
  }

  const t = (jdUtExact - 2451545.0) / 36525
  const seconds = 21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813))
  return 23 + 26 / 60 + seconds / 3600
}

export function formatObliquityDms(meanObliquityDeg: number): string {
  if (!Number.isFinite(meanObliquityDeg)) {
    throw new Error('meanObliquityDeg must be a finite number.')
  }

  const sign = meanObliquityDeg < 0 ? '-' : ''
  let remaining = Math.abs(meanObliquityDeg)
  let degrees = Math.floor(remaining)
  remaining = (remaining - degrees) * 60
  let minutes = Math.floor(remaining)
  let seconds = Math.round((remaining - minutes) * 60)

  if (seconds === 60) {
    seconds = 0
    minutes += 1
  }
  if (minutes === 60) {
    minutes = 0
    degrees += 1
  }

  return `${sign}${degrees}°${String(minutes).padStart(2, '0')}'${String(seconds).padStart(2, '0')}"`
}
