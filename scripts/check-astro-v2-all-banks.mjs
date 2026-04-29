import { spawnSync } from 'node:child_process'

function run(cmd, args, env = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  if (result.status !== 0) process.exitCode = result.status ?? 1
}

run('node', ['scripts/check-astro-v2-question-bank.mjs'], process.env.ASTRO_V2_FULL_BANK === '1' ? { ASTRO_V2_FULL_BANK: '1' } : {})
run(
  'node',
  ['scripts/check-astro-v2-generic-qa-bank.mjs'],
  process.env.ASTRO_V2_GENERIC_QA_FULL === '1' ? { ASTRO_V2_GENERIC_QA_FULL: '1' } : {},
)
