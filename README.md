# Global Signals

Una demo moderna i responsive de [Statcounter Global Stats](https://gs.statcounter.com/), amb interfície en anglès i gràfics **TeeChart JS**. Preparada per desplegar a **Vercel Hobby** sense base de dades, serveis de pagament ni claus d’API.

## Executar en local

Requereix **Node.js 22.12+** (recomanat: Node 24) i **pnpm 12.3.4**. La versió de pnpm està fixada a `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Obre `http://localhost:4321`.

```sh
pnpm build          # Comprovació TypeScript + compilació Astro/Vercel
pnpm test           # Validació del CSV, filtres, memòria cau i fallbacks
pnpm exec playwright install chromium
pnpm test:e2e       # Navegador: gràfics reals, filtres, mòbil, exports i errors
pnpm data:check     # Verificació en viu contra StatCounter; requereix xarxa
```

## Desplegar a Vercel gratuïtament

1. Puja aquest repositori al teu GitHub.
2. A Vercel, selecciona **Add New → Project** i importa’l.
3. El fitxer `vercel.json` configura el preset **Astro**, la instal·lació amb `pnpm install --frozen-lockfile` i la compilació amb `pnpm build`. Deixa l’Output Directory al valor automàtic del preset.
4. Fes servir **Node.js 24.x** i desplega. No cal configurar variables d’entorn.

L’adaptador oficial genera `.vercel/output`: la pàgina principal i els assets són estàtics; `/api/stats` és l’única funció serverless. El pla Hobby és adequat per a aquesta demo personal, subjecte a les seves quotes i condicions. No cal cron ni cap complement de pagament. La connexió del projecte a Vercel s’ha de fer amb el teu compte.

`astro preview` només previsualitza els assets estàtics d’aquest adaptador. Per comprovar la pàgina i l’API conjuntament, fes servir `pnpm dev`, o `vercel dev` si tens Vercel CLI configurat.

## Per què Astro + Preact?

La pàgina és un dashboard únic. No necessita les funcionalitats de routing, autenticació ni renderització dinàmica de Next.js.

- **Astro** genera HTML estàtic amb contingut real visible abans de la hidratació.
- **Una illa Preact** gestiona filtres, taules, llegenda, URL compartible i descàrregues.
- **TeeChart JS** dibuixa els gràfics de línies i barres sobre Canvas. És la biblioteca open source de Steema, sota llicència MIT, allotjada al mateix domini i fixada a una revisió concreta.
- **Una funció Vercel** consulta i valida l’export CSV de StatCounter, evitant dependències del CORS del proveïdor.
- Les tipografies també s’allotgen localment; no es consulta Google Fonts des del navegador.

## Dades i actualització

Font: [Statcounter Global Stats](https://gs.statcounter.com/). El dashboard ofereix navegadors, sistemes operatius, cercadors i dispositius; món, continents i una selecció de països; i segmentació per ordinador, mòbil o tauleta.

L’export públic `https://gs.statcounter.com/chart.php?...&csv=1` proporciona sèries mensuals sense compte ni clau d’API. **No és una API versionada amb garanties de disponibilitat**; la integració està encapsulada a `src/lib/statcounter.ts` perquè sigui fàcil d’adaptar si canvia.

- Es consulten **24 mesos tancats**, fins al mes anterior a la data actual del servidor. El selector mostra els últims 6, 12 o 24, sense tornar a consultar la font.
- StatCounter publica dades diàriament, aproximadament a les 13:00 GMT, i les pot revisar durant els primers 45 dies. Aquesta demo en mostra la granularitat mensual.
- La funció estableix `s-maxage=21600` (6 hores) i `stale-while-revalidate=86400` per a la CDN de Vercel, i també una memòria cau en procés i deduplicació de consultes simultànies. La persistència i la reutilització d’aquesta memòria depenen del cicle de vida de la funció; no són una base de dades.
- El navegador reutilitza les consultes durant 15 minuts. **Refresh data** invalida aquesta memòria local; la resposta encara pot venir de la CDN o de la memòria cau del servidor.
- `src/data/snapshot.json` és una instantània real del període octubre de 2024–setembre de 2026. S’inclou al primer HTML perquè la pantalla no comenci buida. Es revalida automàticament en carregar.
- Si la font falla, l’API pot retornar l’última còpia vàlida del mateix àmbit en procés, o la instantània inclosa per a navegadors globals. Aquests fallbacks s’etiqueten com a còpia desada i no es guarden a la CDN. Per a àmbits sense còpia, es mostra un error i es conserva la consulta anterior, identificada.
- La font és una mesura de **quota d’ús basada en pàgines vistes**, no d’usuaris únics. Els cercadors es mesuren per referències de trànsit. El gràfic de barres mostra l’últim mes, **no una mitjana dels percentatges de tot el període**.

Per renovar la instantània inicial abans d’un nou desplegament:

```sh
pnpm data:refresh
pnpm build
```

Les consultes en viu continuen actualitzant-se sense necessitat de tornar a desplegar. Actualitzar la instantània és opcional i només millora el contingut inicial i el fallback.

## Interaccions

- Navegació entre les quatre estadístiques.
- Filtres per regió, dispositiu i període.
- Evolució mensual i comparació del darrer mes amb TeeChart JS.
- Tooltip amb ratolí, interacció tàctil i fletxes del teclat.
- Llegenda per amagar/mostrar sèries, mantenint-ne almenys una visible.
- Taula del darrer mes o històric mensual, amb cerca de categories.
- Descàrrega CSV de totes les sèries del període, amb atribució i data de consulta.
- PNG del gràfic visible amb font, llicència i llegenda.
- Enllaç compartible que conserva estadística, regió, dispositiu, període i tipus de gràfic.
- Tema clar/fosc amb preferència del sistema, commutador manual i elecció desada al navegador.
- Menú mòbil, diàleg de metodologia, estats de càrrega i errors explícits.

## Estructura

```text
src/pages/index.astro        Pàgina estàtica i hidratació de l’illa
src/pages/api/stats.ts       Funció serverless i memòria cau
src/components/Dashboard.tsx Interfície i estat interactiu
src/components/TeeChart.tsx  Canvas responsive/HiDPI i tooltips
src/lib/teechart.ts          Càrrega asíncrona i tipus de l’API utilitzada
src/lib/statcounter.ts       CSV, URL d’origen i validació de les dades
src/lib/model.ts             Filtres admesos, formatació i exports
src/data/snapshot.json      Instantània real del primer HTML
public/vendor/              TeeChart JS i llicència MIT original
```

TeeChart està fixat al commit `a958b8ba77f1ff9a6480e6ac60d126c4ad45d7c1` de [Steema/TeeChartJS](https://github.com/Steema/TeeChartJS). `pnpm vendor:sync` torna a descarregar aquests mateixos fitxers; no és necessari per instal·lar o compilar.

## Atribució i llicències

Les dades són de **Statcounter Global Stats**, sota [Creative Commons Attribution-ShareAlike 3.0 Unported](https://creativecommons.org/licenses/by-sa/3.0/). L’atribució i l’enllaç es mostren a la pàgina i als exports. Les dades redistribuïdes o adaptades mantenen aquesta llicència. [Condicions publicades a la FAQ](https://gs.statcounter.com/faq#credit-license).

TeeChart JS: MIT, amb el text original a `public/vendor/TeeChart-LICENSE.txt`. Les tipografies DM Sans i Manrope són SIL Open Font License; les seves llicències són a `public/vendor/dm-sans-LICENSE.txt` i `public/vendor/manrope-LICENSE.txt`. Icones Lucide: ISC. Global Signals és un projecte independent i no està afiliat a StatCounter.
