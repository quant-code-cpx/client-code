import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, relative } from 'node:path';
import {
  rmSync,
  mkdirSync,
  existsSync,
  renameSync,
  mkdtempSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const defaultInputPath = resolve(projectRoot, '../server-code/swagger.json');
const artifactPath = resolve(projectRoot, 'openapi/agent-openapi.json');
const configuredInput = process.env.AGENT_OPENAPI_PATH;
const checkOnly = process.argv.includes('--check');
const inputPath = configuredInput
  ? resolve(projectRoot, configuredInput)
  : existsSync(defaultInputPath)
    ? defaultInputPath
    : artifactPath;
const checkingSnapshotOnly = inputPath === artifactPath;
const outputPath = resolve(projectRoot, 'src/api/generated/agent-api.ts');

if (!existsSync(inputPath)) {
  throw new Error(
    `Agent OpenAPI input missing: ${relative(projectRoot, inputPath)}. ` +
      'Set AGENT_OPENAPI_PATH to the downloaded backend artifact.'
  );
}

const document = JSON.parse(readFileSync(inputPath, 'utf8'));
if (typeof document.openapi !== 'string' || document.paths === null || typeof document.paths !== 'object') {
  throw new Error(`Invalid OpenAPI document: ${relative(projectRoot, inputPath)}`);
}

const tempDir = mkdtempSync(resolve(tmpdir(), 'quant-agent-openapi-'));
const filteredInputPath = resolve(tempDir, 'agent-openapi.json');
const generatedPath = resolve(tempDir, 'agent-api.ts');

function agentDocument(source) {
  const paths = Object.fromEntries(
    Object.entries(source.paths)
      .filter(([path]) => /^\/(api\/)?agent\//.test(path))
      // The runtime client owns the `/api` transport prefix. Keep generated
      // contract keys transport-agnostic so they match AGENT_JSON_PATHS.
      .map(([path, operation]) => [path.replace(/^\/api(?=\/agent\/)/, ''), operation])
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

const filteredDocument = agentDocument(document);
const agentPathCount = Object.keys(filteredDocument.paths).length;
if (agentPathCount === 0) {
  throw new Error(
    `Agent OpenAPI input contains no /agent/** paths: ${relative(projectRoot, inputPath)}`
  );
}
const artifactContent = `${JSON.stringify(filteredDocument, null, 2)}\n`;

try {
  writeFileSync(filteredInputPath, artifactContent);
  const cliPath = resolve(projectRoot, 'node_modules/openapi-typescript/bin/cli.js');
  execFileSync(process.execPath, [cliPath, filteredInputPath, '--output', generatedPath], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  const prettierPath = resolve(projectRoot, 'node_modules/prettier/bin/prettier.cjs');
  execFileSync(process.execPath, [prettierPath, '--write', generatedPath], {
    cwd: projectRoot,
    stdio: 'ignore',
  });

  const generated = readFileSync(generatedPath, 'utf8');
  const current = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : null;
  const artifactDrift =
    !existsSync(artifactPath) || readFileSync(artifactPath, 'utf8') !== artifactContent;

  if (checkOnly) {
    if (current === generated && !artifactDrift) {
      process.stdout.write(
        checkingSnapshotOnly
          ? 'Agent API generated code matches the committed snapshot (upstream not checked).\n'
          : 'Agent API contract is up to date with the backend Swagger.\n'
      );
    } else {
      process.stderr.write('Agent API contract drift detected. Run yarn api:agent:generate.\n');
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
