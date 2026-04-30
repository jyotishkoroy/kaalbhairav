// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.
// 
import fs from "node:fs";
import path from "node:path";
import { parseBenchmarkMarkdownFile, parseBenchmarkMarkdownFiles } from "../lib/astro/rag/benchmark-parser";

type CliArgs = {
  input?: string;
  output?: string;
  defaultDomain?: string;
  sourceRoot?: string;
  json?: boolean;
  pretty?: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--input") args.input = argv[++i];
    else if (value === "--output") args.output = argv[++i];
    else if (value === "--default-domain") args.defaultDomain = argv[++i];
    else if (value === "--source-root") args.sourceRoot = argv[++i];
    else if (value === "--json") args.json = true;
    else if (value === "--pretty") args.pretty = true;
  }
  return args;
}

function readFiles(inputPath: string): Array<{ sourceFile: string; content: string }> {
  const stats = fs.statSync(inputPath);
  if (stats.isFile()) return [{ sourceFile: inputPath, content: fs.readFileSync(inputPath, "utf8") }];
  const entries = fs.readdirSync(inputPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => ({ sourceFile: path.join(inputPath, entry.name), content: fs.readFileSync(path.join(inputPath, entry.name), "utf8") }));
}

function safeOutputPath(output?: string): boolean {
  if (!output) return true;
  const normalized = path.resolve(output);
  return !normalized.includes(`${path.sep}lib${path.sep}`) && !normalized.includes(`${path.sep}scripts${path.sep}`) && !normalized.includes(`${path.sep}tests${path.sep}`);
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.input) {
    console.error("missing --input");
    process.exit(1);
  }
  const files = readFiles(args.input);
  const result = files.length === 1
    ? parseBenchmarkMarkdownFile({ sourceFile: files[0].sourceFile, content: files[0].content, options: { defaultDomain: args.defaultDomain, sourceRoot: args.sourceRoot } })
    : parseBenchmarkMarkdownFiles({ files, options: { defaultDomain: args.defaultDomain, sourceRoot: args.sourceRoot } });
  const output = {
    stats: result.stats,
    issues: result.issues,
    examples: result.examples,
  };
  if (args.output) {
    if (!safeOutputPath(args.output)) {
      console.error("refusing to write output into tracked source folders");
      process.exit(1);
    }
    fs.writeFileSync(args.output, JSON.stringify(output, null, args.pretty ? 2 : 0));
  }
  if (args.json) {
    process.stdout.write(JSON.stringify(output, null, args.pretty ? 2 : 0));
  } else {
    process.stdout.write(`files=${result.stats.filesRead} parsed=${result.stats.examplesParsed} skipped=${result.stats.examplesSkipped} duplicates=${result.stats.duplicateCount}\n`);
  }
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
