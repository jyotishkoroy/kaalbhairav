import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(root, 'generated', 'astro-v2-generic-qa-bank')
const jsonlPath = path.join(dir, 'generated-generic-qa-bank.jsonl')
const summaryPath = path.join(dir, 'generated-generic-qa-bank-summary.json')

if (!fs.existsSync(jsonlPath) || !fs.existsSync(summaryPath)) {
  throw new Error('Generic QA bank missing. Run npm run parse:astro-v2-generic-qa-bank first.')
}

const limit = process.env.ASTRO_V2_GENERIC_QA_FULL === '1' ? 50000 : Number(process.env.ASTRO_V2_GENERIC_QA_LIMIT ?? 1000)
const records = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n').slice(0, limit).map((line) => JSON.parse(line))
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
const issues = []

if (summary.totalRecords !== 50000) issues.push('summary_total_mismatch')
if (records.length !== limit) issues.push('limit_mismatch')

const report = {
  checked: records.length,
  issues,
  summary,
}

fs.writeFileSync(path.join(dir, 'check-report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
if (issues.length) process.exitCode = 1
