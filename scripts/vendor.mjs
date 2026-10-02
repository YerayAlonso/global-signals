// Reproducible, self-hosted upstream assets. Never execute downloaded source here.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const revision = 'a958b8ba77f1ff9a6480e6ac60d126c4ad45d7c1';
const root = new URL('../public/vendor/', import.meta.url);
await mkdir(root, { recursive: true });
for (const [remote, local] of [['src/teechart.js', 'teechart.js'], ['LICENSE', 'TeeChart-LICENSE.txt']]) {
  const response = await fetch(`https://raw.githubusercontent.com/Steema/TeeChartJS/${revision}/${remote}`);
  if (!response.ok) throw new Error(`Vendor download: ${response.status}`);
  await writeFile(new URL(local, root), await response.text());
  console.log(`Vendored ${local} @ ${revision}`);
}
for (const font of ['dm-sans', 'manrope']) {
  const license = await readFile(new URL(`../node_modules/@fontsource-variable/${font}/LICENSE`, import.meta.url));
  await writeFile(new URL(`${font}-LICENSE.txt`, root), license);
}
