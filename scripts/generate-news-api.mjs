import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const defaultInputPath = resolve(projectRoot, '../server-code/swagger.json');
const artifactPath = resolve(projectRoot, 'openapi/news-openapi.json');
const configuredInput = process.env.NEWS_OPENAPI_PATH;
const checkOnly = process.argv.includes('--check');
const inputPath = configuredInput
  ? resolve(projectRoot, configuredInput)
  : checkOnly
    ? artifactPath
    : existsSync(defaultInputPath)
      ? defaultInputPath
      : artifactPath;
const outputPath = resolve(projectRoot, 'src/api/generated/news-api.ts');

if (!existsSync(inputPath)) {
  throw new Error(
    `News OpenAPI input missing: ${relative(projectRoot, inputPath)}. ` +
      'Set NEWS_OPENAPI_PATH to the downloaded backend artifact.'
  );
}

const document = JSON.parse(readFileSync(inputPath, 'utf8'));
if (
  typeof document.openapi !== 'string' ||
  document.paths === null ||
  typeof document.paths !== 'object'
) {
  throw new Error(`Invalid OpenAPI document: ${relative(projectRoot, inputPath)}`);
}

const tempDir = mkdtempSync(resolve(tmpdir(), 'quant-news-openapi-'));
const filteredInputPath = resolve(tempDir, 'news-openapi.json');
const generatedPath = resolve(tempDir, 'news-api.ts');

function newsDocument(source) {
  const paths = Object.fromEntries(
    Object.entries(source.paths).filter(([path]) => /^\/(api\/)?news\//.test(path))
  );
  const selectedComponents = {};
  const visitedRefs = new Set();
  const pending = [paths];

  while (pending.length > 0) {
    const value = pending.pop();
    if (Array.isArray(value)) {
      pending.push(...value);
      continue;
    }
    if (value === null || typeof value !== 'object') continue;

    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref' && typeof child === 'string' && child.startsWith('#/components/')) {
        if (visitedRefs.has(child)) continue;
        visitedRefs.add(child);
        const [, , section, name] = child.split('/');
        const component = source.components?.[section]?.[name];
        if (component !== undefined) {
          selectedComponents[section] ??= {};
          selectedComponents[section][name] = component;
          pending.push(component);
        }
      } else {
        pending.push(child);
      }
    }
  }

  if (source.components?.securitySchemes) {
    selectedComponents.securitySchemes = source.components.securitySchemes;
  }
  return { ...source, paths, components: selectedComponents };
}

const filteredDocument = newsDocument(document);
if (Object.keys(filteredDocument.paths).length !== 7) {
  throw new Error(
    `News OpenAPI must contain exactly 7 /news/** paths, received ${Object.keys(filteredDocument.paths).length}.`
  );
}
let artifactContent = `${JSON.stringify(filteredDocument, null, 2)}\n`;

try {
  writeFileSync(filteredInputPath, artifactContent);
  const prettierPath = resolve(projectRoot, 'node_modules/prettier/bin/prettier.cjs');
  execFileSync(
    process.execPath,
    [
      prettierPath,
      '--config',
      resolve(projectRoot, 'prettier.config.mjs'),
      '--write',
      filteredInputPath,
    ],
    {
      cwd: projectRoot,
      stdio: 'ignore',
    }
  );
  artifactContent = readFileSync(filteredInputPath, 'utf8');
  const cliPath = resolve(projectRoot, 'node_modules/openapi-typescript/bin/cli.js');
  execFileSync(process.execPath, [cliPath, filteredInputPath, '--output', generatedPath], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  execFileSync(
    process.execPath,
    [
      prettierPath,
      '--config',
      resolve(projectRoot, 'prettier.config.mjs'),
      '--write',
      generatedPath,
    ],
    {
      cwd: projectRoot,
      stdio: 'ignore',
    }
  );

  const generated = readFileSync(generatedPath, 'utf8');
  const current = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : null;
  const artifactDrift =
    !existsSync(artifactPath) || readFileSync(artifactPath, 'utf8') !== artifactContent;

  if (checkOnly) {
    if (current === generated && !artifactDrift) {
      process.stdout.write('News API contract is up to date.\n');
    } else {
      process.stderr.write('News API contract drift detected. Run yarn api:news:generate.\n');
      if (artifactDrift) process.stderr.write('OpenAPI artifact snapshot is stale.\n');
      if (current !== null) {
        try {
          execFileSync('git', ['diff', '--no-index', '--', outputPath, generatedPath], {
            cwd: projectRoot,
            stdio: 'inherit',
          });
        } catch {
          // git diff returns 1 when files differ; drift failure is reported below.
        }
      }
      process.exitCode = 1;
    }
  } else {
    mkdirSync(dirname(artifactPath), { recursive: true });
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(`${artifactPath}.tmp`, artifactContent);
    renameSync(`${artifactPath}.tmp`, artifactPath);
    copyFileSync(generatedPath, `${outputPath}.tmp`);
    renameSync(`${outputPath}.tmp`, outputPath);
    process.stdout.write(`Generated ${relative(projectRoot, outputPath)}.\n`);
  }
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
