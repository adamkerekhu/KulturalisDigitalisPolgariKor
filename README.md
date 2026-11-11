# LAST ORDERS · Mester utca (V0.2)

A free, browser-playable, top-down roaming game built with **Phaser 3.90**, TypeScript and Vite, hosted as static assets on Cloudflare Workers.

## Current gameplay

- One playable pedestrian, WASD/arrow keys, Shift to run
- Phaser Arcade Physics building collisions and follow camera
- Red car: press E near it to enter, W/S accelerate/reverse, A/D steer, E to exit
- Green Bubi bicycle: E to ride or dismount
- Labeled Maestro Pub, SPAR, tobacco shop and Mester Gyros
- Mobile joystick + E control, +/- zoom on desktop

The Mester utca environment is a **schematic placeholder**, not actual survey-grade geographical data. Do not use it for navigation. Shop placements beyond Maestro are illustrative and must be confirmed before a faithful neighborhood map is produced.

## Architecture

- `src/main.ts`: Phaser initialization
- `src/scenes/StreetScene.ts`: game world, input and gameplay loop
- `src/entities/Player.ts`: character controller with Arcade Physics
- `src/entities/Vehicle.ts`: drivable car and rideable bicycle
- `src/world/map.ts`: editable map geometry, landmarks and collision rectangles
- `src/style.css`: HUD and mobile controls

No React, Supabase, server, paid map API, registration or multiplayer yet. All gameplay is local to the browser.

## Local development

```bash
npm install
npm run dev
```

## Production build and Cloudflare deployment

Cloudflare Workers Builds settings:

- Branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

The Vite output is `dist/`. The existing `wrangler.jsonc` serves `dist/` as Worker static assets.

To deploy locally (with Wrangler authenticated):

```bash
npm run deploy
```

## Future work

Implement geographically verified OSM-derived streets, map editing via LDtk, authentic pixel-art assets, enterable interiors and later multiplayer with Cloudflare Durable Objects.

## V0.3: permanent OpenStreetMap snapshot

The game reads `public/osm-map.json` at runtime. **Cloudflare builds never request OpenStreetMap**.

To refresh the map, run GitHub Actions → "Import OpenStreetMap snapshot (manual refresh)" → Run workflow on `develop`, or run `npm run refresh:map` locally and commit `public/osm-map.json`. The workflow validates the downloaded roads/buildings and commits the real data to `develop` automatically.

Only merge `develop` into `main` after `public/osm-map.json` exists with real OSM data and `npm run build` succeeds. If the import service is unavailable, the workflow fails without changing the previous snapshot. This protects the working game and avoids spurious production deployments.

Attribution: **© OpenStreetMap contributors, ODbL** · https://www.openstreetmap.org/copyright

### Production deployment
Cloudflare builds are configured on the `main` branch, with `npm run build` and `npx wrangler deploy`. Geographic import happens separately on `develop`; the actual players never call Overpass.

### Map limitations
The vector map uses genuine OSM roads, buildings and tram tracks. Building collision still approximates polygons using rectangles. Some business locations can be missing in OSM and need manual verification. The simplified map remains a fallback until a real snapshot is committed.
