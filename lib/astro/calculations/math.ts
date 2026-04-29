/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

// Math utilities for Jyotish calculations. All inputs/outputs in degrees.

export function normalize360(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

export function angularDifference(a: number, b: number): number {
  const diff = Math.abs(normalize360(a) - normalize360(b))
  return Math.min(diff, 360 - diff)
}

export function nearModuloBoundary(value: number, span: number): boolean {
  const x = normalize360(value) % span
  const distance = Math.min(x, span - x)
  return distance <= 1 / 60
}

export function nearLinearBoundary(valueWithinSpan: number, span: number): boolean {
  const distance = Math.min(valueWithinSpan, span - valueWithinSpan)
  return distance <= 1 / 60
}
