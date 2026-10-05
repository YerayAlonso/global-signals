// Copy the pinned TeeChart package files into the self-hosted public assets.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const root = new URL('../public/vendor/', import.meta.url);
const teeChart = new URL('../node_modules/teechart.js/', import.meta.url);
const { version } = JSON.parse(await readFile(new URL('package.json', teeChart), 'utf8'));
await mkdir(root, { recursive: true });
for (const [source, local] of [
  ['dist/teechart.js', 'teechart.js'],
  ['dist/teechart.js.map', 'teechart.js.map'],
  ['LICENSE.md', 'TeeChart-LICENSE.md'],
]) {
  const asset = await readFile(new URL(source, teeChart));
  const contents = local === 'teechart.js' ? asset.toString().replace('/** \n', '/**\n') : asset;
  await writeFile(new URL(local, root), contents);
  console.log(`Vendored ${local} from teechart.js@${version}`);
}
for (const font of ['dm-sans', 'manrope']) {
  const license = await readFile(new URL(`../node_modules/@fontsource-variable/${font}/LICENSE`, import.meta.url));
  await writeFile(new URL(`${font}-LICENSE.txt`, root), license);
}
