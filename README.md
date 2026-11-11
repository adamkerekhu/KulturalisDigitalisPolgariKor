# LAST ORDERS · Mester utca

Free, GTA 2-inspired top-down browser game taking place around Maestro Pub in Budapest IX.

## V0.5 features

- Actual OpenStreetMap street and building geometry (permanent versioned snapshot in `public/osm-map.json`)
- Consistent real-world scale at **5 world pixels per metre**
- Close on-foot camera, wider camera and directional look-ahead while driving
- Drivable streets and slower handling off-road; roads and service roads remain accessible
- Car and MOL Bubi sized to real street dimensions; park next to Maestro
- Polygon-aware walking and vehicle collisions that preserve irregularly shaped buildings and courtyards
- Original procedural Budapest roof artwork: roof slopes/ridges, brick tones, chimneys, skylights, roof shadows and lower wall/windows
- Landmarks from OSM tags plus Maestro and SPAR anchors; other shop locations are only as accurate as OSM

## Controls

**WASD** or arrows: walk/steer and accelerate/reverse; **Shift**: sprint; **E**: vehicle/POI interaction; **+/-**: camera zoom. Touch joystick and E are available on mobile.

## Architecture

```
src/
  main.ts                     Phaser game bootstrapping
  scenes/StreetScene.ts       Loading, camera, controls, POIs
  entities/Player.ts          Human character and polygon collision
  entities/Vehicle.ts         Road-aware car / Bubi controller
  world/geo.ts                OSM projection, scale, road segmentation, polygons
  world/CityRenderer.ts       Procedural game-world surfaces and building art
  world/osm.ts                OSM input schema
public/osm-map.json           Offline bundled map snapshot
scripts/fetch-osm.mjs         Explicit map refresh only
```

### Run and build

```bash
npm install
npm run dev
npm run build
```

Cloudflare Workers Builds on `main`:
- Build: `npm run build`
- Deploy: `npx wrangler deploy`

No map API key, no Google billing, no backend, no database and no multiplayer in this version. Public Overpass availability is NOT required during normal builds.

## Visual realism and licensing

Street and building **geometry** comes from OpenStreetMap (© OpenStreetMap contributors, ODbL, https://www.openstreetmap.org/copyright). All roof and façade textures are generated original procedural artwork. The building appearances are **not** verified photo-matched reproductions of Google Street View or Google Maps, which must not be copied or traced into game assets without appropriate rights.

Roof style is a Budapest-inspired approximation. Correct residential roofs, storefront façades and accurate building heights still require independently licensed photographs or original references.

## Limitations

The map contains OSM way footprints; complex multi-ring building multipolygons may still need further treatment. Street widths are categorized estimates where explicit widths are absent. Vehicles do not yet interact with live traffic, traffic lights or pedestrian NPCs. Interiors and multiplayer are future work.
