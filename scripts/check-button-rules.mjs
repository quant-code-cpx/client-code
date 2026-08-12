import fs from 'node:fs';
import ts from 'typescript';
import path from 'node:path';
import process from 'node:process';

const SOURCE_DIR = path.resolve('src');
const HEIGHT_EXCEPTION = 'layouts/components/account-popover.tsx';
const NON_SEMANTIC_CLICK_COMPONENTS = new Set([
  'Box',
  'Card',
  'Paper',
  'Stack',
  'TableRow',
  'Typography',
]);
const SEMANTIC_COMPONENT_PATTERN =
  /(?:\bButtonBase\b|\bCardActionArea\b|\bRouterLink\b|\bLink\b|["'](?:a|button)["'])/;
const violations = [];

function collectFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : collectFiles(file);
    }

    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.tsx') ? [file] : [];
  });
}

function getTagName(node) {
  return ts.isIdentifier(node.tagName) ? node.tagName.text : undefined;
}

function getAttribute(opening, name) {
  return opening.attributes.properties.find(
    (property) =>
      ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name
  );
}

function getStringAttribute(opening, name) {
  const attribute = getAttribute(opening, name);

  return attribute && ts.isStringLiteral(attribute.initializer)
    ? attribute.initializer.text
    : undefined;
}

function hasAncestor(node, componentNames, target) {
  let current = node.parent;

  while (current) {
    if (
      ts.isJsxElement(current) &&
      componentNames.get(getTagName(current.openingElement)) === target
    ) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function getTextContent(node) {
  return node.children
    .filter(ts.isJsxText)
    .map((child) => child.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function addViolation(file, sourceFile, node, message) {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  violations.push(`${path.relative(process.cwd(), file)}:${line + 1} ${message}`);
}

function getComponentNames(sourceFile) {
  const names = new Map();

  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) return;

    const moduleName = node.moduleSpecifier.text;
    const defaultComponent =
      moduleName.startsWith('@mui/material/') || moduleName === '@mui/lab/LoadingButton'
        ? moduleName.split('/').at(-1)
        : undefined;

    const namedBindings = node.importClause?.namedBindings;
    if (
      namedBindings &&
      ts.isNamedImports(namedBindings) &&
      (moduleName === '@mui/material' || moduleName === '@mui/lab')
    ) {
      for (const specifier of namedBindings.elements) {
        names.set(specifier.name.text, specifier.propertyName?.text ?? specifier.name.text);
      }
    }

    if (defaultComponent && node.importClause?.name) {
      names.set(node.importClause.name.text, defaultComponent);
    }
  });

  return names;
}

function checkFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const componentNames = getComponentNames(sourceFile);
  const relativeFile = path.relative(SOURCE_DIR, file).replaceAll(path.sep, '/');

  function checkNonSemanticClick(opening) {
    const component = componentNames.get(getTagName(opening));
    if (!NON_SEMANTIC_CLICK_COMPONENTS.has(component) || !getAttribute(opening, 'onClick')) return;

    const componentProp = getAttribute(opening, 'component');
    const hasSemanticComponent =
      componentProp && SEMANTIC_COMPONENT_PATTERN.test(componentProp.getText(sourceFile));
    const sx = getAttribute(opening, 'sx');
    const hasKeyboardFallback =
      getAttribute(opening, 'role') &&
      getAttribute(opening, 'tabIndex') &&
      getAttribute(opening, 'onKeyDown') &&
      sx?.getText(sourceFile).includes('focus-visible');

    if (!hasSemanticComponent && !hasKeyboardFallback) {
      addViolation(
        file,
        sourceFile,
        opening,
        '非语义点击入口必须使用语义 component，或补齐 role/tabIndex/onKeyDown/focus-visible'
      );
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      if (node.moduleSpecifier.text === '@mui/lab/LoadingButton') {
        addViolation(
          file,
          sourceFile,
          node,
          '禁止使用 @mui/lab/LoadingButton，改用 Button loading'
        );
      }
    }

    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      const component = componentNames.get(getTagName(opening));

      checkNonSemanticClick(opening);

      if (component === 'IconButton' && !hasAncestor(node, componentNames, 'Tooltip')) {
        addViolation(file, sourceFile, opening, 'IconButton 必须由 Tooltip 包裹');
      }

      if (component === 'Button') {
        const startIcon = getAttribute(opening, 'startIcon');

        if (startIcon?.getText(sourceFile).includes('CircularProgress')) {
          addViolation(
            file,
            sourceFile,
            opening,
            'Button 不得在 startIcon 中手工渲染 CircularProgress'
          );
        }

        if (
          getStringAttribute(opening, 'variant') === 'outlined' &&
          getStringAttribute(opening, 'color') === 'inherit'
        ) {
          addViolation(
            file,
            sourceFile,
            opening,
            '普通 outlined 不得使用 color="inherit"，应使用默认 primary'
          );
        }

        if (
          hasAncestor(node, componentNames, 'DialogActions') &&
          /取消|关闭/.test(getTextContent(node)) &&
          getStringAttribute(opening, 'color') !== 'inherit'
        ) {
          addViolation(
            file,
            sourceFile,
            opening,
            'DialogActions 中的取消/关闭按钮必须使用 color="inherit"'
          );
        }
      }

      if (['Button', 'IconButton', 'ToggleButton'].includes(component)) {
        const sx = getAttribute(opening, 'sx');

        if (
          sx &&
          relativeFile !== HEIGHT_EXCEPTION &&
          /\b(?:height|minHeight|maxHeight)\s*:/.test(sx.getText(sourceFile))
        ) {
          addViolation(file, sourceFile, opening, '不得通过 sx 覆盖 Button 家族高度基线');
        }
      }
    }

    if (ts.isJsxSelfClosingElement(node)) {
      checkNonSemanticClick(node);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

for (const file of collectFiles(SOURCE_DIR)) {
  checkFile(file);
}

if (violations.length) {
  console.error('Button 规则检查失败：');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('Button 规则检查通过');
