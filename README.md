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

## V0.3 OpenStreetMap import

At build time `scripts/fetch-osm.mjs` fetches streets, tram tracks, buildings and nearby mapped POIs from the free Overpass API for a bounding box covering Mester utca. The downloaded vector data is bundled into `dist/osm-map.json`, so players do **not** query map APIs during gameplay. No API key or billing required.

`src/world/osm.ts` converts geographic coordinates to game-world coordinates and renders the streets/buildings in Phaser. Maestro Pub (47.47857, 19.07400) and SPAR Market (47.4784266, 19.0742364) are pinned from public listings; other businesses are identified from OSM tags where present. Building collision uses approximate bounding rectangles, not yet precise polygon walls.

If all public Overpass endpoints are unavailable at build time, the pipeline deliberately emits an empty map response and the game falls back to the prior schematic world. Check Cloudflare build logs for `Extracted ... map elements` to confirm the real import succeeded.

**OpenStreetMap data © OpenStreetMap contributors, ODbL:** https://www.openstreetmap.org/copyright

Use `npm run build` to import and compile, then `npx wrangler deploy` to publish. No additional accounts or paid APIs are necessary.
