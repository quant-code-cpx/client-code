import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const MIN_CHANGED_LINE_COVERAGE = 70;
const LCOV_PATH = path.resolve('coverage/lcov.info');

if (!fs.existsSync(LCOV_PATH)) {
  console.error('缺少 coverage/lcov.info，请先运行 yarn test:coverage。');
  process.exit(1);
}

const base = resolveDiffBase();
const diff = readDiff(base);
const changedLines = parseChangedLines(diff);
const coverage = readLineCoverage(LCOV_PATH);
const rows = [];

for (const [file, lines] of changedLines) {
  const lineHits = coverage.get(file);
  if (!lineHits) continue;

  const executableLines = [...lines].filter((line) => lineHits.has(line));
  if (executableLines.length === 0) continue;

  const covered = executableLines.filter((line) => (lineHits.get(line) ?? 0) > 0).length;
  rows.push({ file, covered, total: executableLines.length });
}

const covered = rows.reduce((sum, row) => sum + row.covered, 0);
const total = rows.reduce((sum, row) => sum + row.total, 0);

if (total === 0) {
  console.log(`Changed-line coverage：无新增或修改的可执行行（base: ${base}）。`);
  process.exit(0);
}

for (const row of rows.sort((left, right) => left.file.localeCompare(right.file))) {
  console.log(`${formatPercent(row.covered, row.total)}  ${row.file} (${row.covered}/${row.total})`);
}

const percent = (covered / total) * 100;
console.log(`Changed-line coverage：${percent.toFixed(2)}% (${covered}/${total})，要求 ≥ ${MIN_CHANGED_LINE_COVERAGE}%`);

if (percent < MIN_CHANGED_LINE_COVERAGE) process.exit(1);

function resolveDiffBase() {
  if (process.env.COVERAGE_DIFF_BASE) return process.env.COVERAGE_DIFF_BASE;

  if (process.env.GITHUB_BASE_REF) {
    const remoteBase = `origin/${process.env.GITHUB_BASE_REF}`;
    if (isGitRevision(remoteBase)) return remoteBase;
  }

  const before = process.env.GITHUB_EVENT_BEFORE;
  if (before && !/^0+$/.test(before) && isGitRevision(before)) return before;

  return 'HEAD';
}

function isGitRevision(revision) {
  try {
    execFileSync('git', ['rev-parse', '--verify', revision], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function readDiff(diffBase) {
  const range =
    diffBase === 'HEAD'
      ? 'HEAD'
      : process.env.GITHUB_BASE_REF
        ? `${diffBase}...HEAD`
        : `${diffBase}..HEAD`;
  return execFileSync(
    'git',
    [
      'diff',
      '--unified=0',
      '--no-ext-diff',
      '--diff-filter=ACMRT',
      range,
      '--',
      'src',
    ],
    { encoding: 'utf8' }
  );
}

function parseChangedLines(diffText) {
  const result = new Map();
  let currentFile;

  for (const line of diffText.split('\n')) {
    if (line.startsWith('+++ b/')) {
      currentFile = normalizePath(line.slice(6));
      continue;
    }

    if (!currentFile || !line.startsWith('@@')) continue;
    const match = line.match(/\+(\d+)(?:,(\d+))?/);
    if (!match) continue;

    const start = Number(match[1]);
    const count = match[2] === undefined ? 1 : Number(match[2]);
    const lines = result.get(currentFile) ?? new Set();
    for (let offset = 0; offset < count; offset += 1) lines.add(start + offset);
    result.set(currentFile, lines);
  }

  return result;
}

function readLineCoverage(file) {
  const result = new Map();
  let currentFile;

  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (line.startsWith('SF:')) {
      currentFile = normalizePath(line.slice(3));
      result.set(currentFile, new Map());
      continue;
    }

    if (!currentFile || !line.startsWith('DA:')) continue;
    const [lineNumber, hits] = line.slice(3).split(',').map(Number);
    result.get(currentFile)?.set(lineNumber, hits);
  }

  return result;
}

function normalizePath(file) {
  return path.relative(process.cwd(), path.resolve(file)).split(path.sep).join('/');
}

function formatPercent(coveredLines, totalLines) {
  return `${((coveredLines / totalLines) * 100).toFixed(2).padStart(6)}%`;
}
