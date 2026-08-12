import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { expect, describe } from 'vitest';

describe('chart focus styles', () => {
  it('does not globally remove focus outlines from ApexCharts controls', () => {
    const stylesPath = resolve(process.cwd(), 'src/components/chart/styles.css');
    const styles = readFileSync(stylesPath, 'utf8');

    expect(styles).not.toMatch(/outline\s*:\s*none/);
  });
});
