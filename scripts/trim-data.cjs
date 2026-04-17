const fs = require('fs');
const path = require('path');
const DIR = 'src/mocks/data';

function trimArrays(obj, maxItems = 50) {
  if (Array.isArray(obj)) {
    return obj.slice(0, maxItems).map((item) => trimArrays(item, maxItems));
  }
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = trimArrays(value, maxItems);
    }
    return result;
  }
  return obj;
}

for (const file of fs.readdirSync(DIR)) {
  if (!file.endsWith('.json')) continue;
  const filePath = path.join(DIR, file);
  const stat = fs.statSync(filePath);
  if (stat.size > 500 * 1024) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const trimmed = trimArrays(data, 50);
    const output = JSON.stringify(trimmed, null, 2);
    fs.writeFileSync(filePath, output, 'utf-8');
    console.log(
      `${file}: ${(stat.size / 1024).toFixed(0)}KB -> ${(output.length / 1024).toFixed(0)}KB`
    );
  }
}
console.log('Done trimming');
