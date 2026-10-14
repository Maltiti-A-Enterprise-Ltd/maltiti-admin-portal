/**
 * Splits the `country-state-city` dataset into per-country files the app can
 * fetch one at a time.
 *
 * Why this exists: importing the library puts its whole dataset in the bundle,
 * and the city list alone is 7.9 MB across 148,038 records. Because the import
 * is static, every page that touches an address form had to download and parse
 * all of it before rendering — which is survivable on a desktop and is not on a
 * phone, where it exceeded iOS Safari's per-tab memory and the page simply
 * never appeared.
 *
 * Nothing here is clever: it is the same data, cut so a form can ask for
 * Ghana's regions without also being handed Peru's.
 *
 * Runs as `prebuild`, so the files exist before `ng build` copies `public/`.
 * The output is generated, not authored — it is gitignored, and the library
 * stays a devDependency as the source of truth.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const source = join(root, 'node_modules', 'country-state-city', 'lib', 'assets');
const target = join(root, 'public', 'assets', 'geo');

const read = (file) => JSON.parse(readFileSync(join(source, file), 'utf8'));

const write = (relativePath, data) => {
  const full = join(target, relativePath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(data));
  return Buffer.byteLength(JSON.stringify(data));
};

rmSync(target, { recursive: true, force: true });

/*
 * Countries keep only what a dropdown shows. The raw records carry timezone
 * tables, currencies and coordinates that nothing here renders, and they are
 * most of the file's weight.
 */
const countries = read('country.json').map((country) => ({
  name: country.name,
  isoCode: country.isoCode,
  flag: country.flag,
}));

let bytes = write('countries.json', countries);

/* Regions, grouped by the country that owns them. */
const statesByCountry = new Map();
for (const state of read('state.json')) {
  const list = statesByCountry.get(state.countryCode) ?? [];
  list.push({ name: state.name, isoCode: state.isoCode });
  statesByCountry.set(state.countryCode, list);
}
for (const [countryCode, states] of statesByCountry) {
  bytes += write(`states/${countryCode}.json`, states);
}

/*
 * Cities arrive as positional tuples — [name, countryCode, stateCode, lat, lng]
 * — and only the first three matter. Grouped by country rather than by region:
 * a country file is already small enough to send whole, and it spares the app a
 * second request every time somebody changes region.
 */
const citiesByCountry = new Map();
for (const [name, countryCode, stateCode] of read('city.json')) {
  const list = citiesByCountry.get(countryCode) ?? [];
  list.push({ name, stateCode });
  citiesByCountry.set(countryCode, list);
}
for (const [countryCode, cities] of citiesByCountry) {
  bytes += write(`cities/${countryCode}.json`, cities);
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const ghanaCities = citiesByCountry.get('GH') ?? [];

console.log(
  `geo assets: ${countries.length} countries, ` +
    `${statesByCountry.size} country region files, ` +
    `${citiesByCountry.size} country city files, ${kb(bytes)} total on disk.\n` +
    `  a Ghana address now costs ` +
    `${kb(Buffer.byteLength(JSON.stringify(countries)))} + ` +
    `${kb(Buffer.byteLength(JSON.stringify(statesByCountry.get('GH') ?? [])))} + ` +
    `${kb(Buffer.byteLength(JSON.stringify(ghanaCities)))} ` +
    `instead of 8.36 MB.`,
);
