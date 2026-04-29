import fs from 'node:fs'
import { getGeneratedPaths } from './astro-question-bank-core.mjs'

const { jsonlPath, summaryPath } = getGeneratedPaths()

if (!fs.existsSync(jsonlPath) || !fs.existsSync(summaryPath)) {
  throw new Error('Generated bank missing. Run npm run generate:astro-v2-question-bank first.')
}

const limit = process.env.ASTRO_V2_FULL_BANK === '1' ? 52000 : Number(process.env.ASTRO_V2_BANK_LIMIT ?? 1000)
const lines = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n').slice(0, limit)
const records = lines.map((line) => JSON.parse(line))
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))

const issues = []

if (summary.totalRecords !== 52000) issues.push('summary_total_mismatch')
if (summary.domainCount !== 26) issues.push('summary_domain_count_mismatch')
if (records.length !== limit) issues.push('limit_mismatch')

for (const record of records.slice(0, 50)) {
  if (!record.question || !record.expectedMustIncludeAny?.length) {
    issues.push(`bad_record:${record.id}`)
    break
  }
}

const report = {
  checked: records.length,
  issues,
  summary: {
    totalRecords: summary.totalRecords,
    domainCount: summary.domainCount,
  },
}

fs.writeFileSync('generated/astro-v2-question-bank/check-report.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))

if (issues.length > 0) {
  process.exitCode = 1
}

