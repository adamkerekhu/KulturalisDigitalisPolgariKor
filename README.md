# LAST ORDERS · Mester utca (V0.1)

A free, single-player top-down browser game around Budapest's Mester utca. Walk around, visit labelled places, ride a MOL Bubi bike, and drive the red car.

## Controls

- WASD or arrow keys: walk / drive
- Shift: sprint on foot
- E: interact / enter / exit vehicle
- +/-: zoom
- Mobile: on-screen joystick and E button

## Technology

**Zero runtime libraries:** HTML5 Canvas + JavaScript. The code runs directly in any recent browser. Cloudflare Workers serves the static HTML. No Supabase, Google Maps API, paid assets, backend or authentication.

## Run locally

Open `index.html` in Chrome/Firefox, or run `python -m http.server 8000` in the repository folder.

## Deploy to Cloudflare Workers

Use the existing Worker name `kulturalisdigitalispolgarikor` and Cloudflare Workers Builds connected to this repository (main branch).

- Install command: `npm install`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

The build copies the game into `public/` and Wrangler serves that folder via static assets. To deploy from your own terminal, run `npm install && npm run deploy` after authenticating with Wrangler.

## Disclaimer

The Mester utca street layout is **stylized and approximate**, not a survey-accurate OSM reconstruction. Maestro Pub is associated with Mester utca 46 and Mester Gyros with Mester utca 12. SPAR, tobacco shop and Bubi placements are gameplay placeholders until verified against geocoded sources. This map is not for navigation.

No third-party map imagery is embedded or reproduced.

## Deployment trigger check (2026-11-11)

A new commit to `main` requests an automatic build through the Cloudflare Workers Git integration. Verify the corresponding build and commit in Cloudflare's Deployments page; a GitHub commit alone does not confirm publication.
