export function isAstroV1UIEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ASTRO_V1_UI_ENABLED === 'true'
}
