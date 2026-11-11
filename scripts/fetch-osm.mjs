import { mkdir, writeFile } from 'node:fs/promises';

const bbox = '47.4754,19.0665,47.4840,19.0791';
const query = `[out:json][timeout:35];(
  way["highway"](${bbox});
  way["building"](${bbox});
  way["railway"="tram"](${bbox});
  node["shop"](${bbox});
  node["amenity"~"pub|bar|fast_food|restaurant"](${bbox});
  node["amenity"="bicycle_rental"](${bbox});
  node["bicycle_rental"](${bbox});
);out geom;`;
const hosts = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];
let data;
for (const host of hosts) {
  try {
    console.log('Fetching OpenStreetMap data from', host);
    const response = await fetch(host, {
      method: 'POST',
      headers: {'Content-Type':'application/x-www-form-urlencoded', 'User-Agent':'LAST-ORDERS-Game/0.3 (+https://github.com/adamkerekhu/KulturalisDigitalisPolgariKor)'},
      body: new URLSearchParams({data:query}),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error('HTTP '+response.status);
    const json = await response.json();
    if (!Array.isArray(json.elements) || json.elements.length < 50) throw new Error('Missing expected map features');
    data = {
      source:'OpenStreetMap contributors · ODbL',
      attribution:'© OpenStreetMap contributors',
      attributionURL:'https://www.openstreetmap.org/copyright',
      bbox:[47.4754,19.0665,47.4840,19.0791],
      generatedAt:new Date().toISOString(),
      elements:json.elements.filter(e=>e.type==='way' && Array.isArray(e.geometry) || e.type==='node' && Number.isFinite(e.lat) && Number.isFinite(e.lon))
    };
    console.log('Extracted',data.elements.length,'map elements');
    break;
  } catch (error) {
    console.warn('Map extraction failed:',host,String(error));
  }
}
await mkdir('public',{recursive:true});
if (data) {
  await writeFile('public/osm-map.json',JSON.stringify(data));
} else {
  // Do not break deployment because of public Overpass availability.
  await writeFile('public/osm-map.json',JSON.stringify({
    error:'OpenStreetMap download unavailable during this build',
    source:'OpenStreetMap contributors · ODbL',elements:[]
  }));
  console.warn('OSM unavailable: client will use the labeled schematic map as fallback.');
}
