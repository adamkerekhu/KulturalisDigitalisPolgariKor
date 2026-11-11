import { mkdir, writeFile } from 'node:fs/promises';

// This is a deliberate, one-off data refresh. NOT part of npm run build.
// Bounding box: Mester utca, Boraros ter to Haller utca and surrounding streets.
const bbox = '47.4754,19.0665,47.4840,19.0791';
const query = `[out:json][timeout:50];(
  way["highway"](${bbox});
  way["building"](${bbox});
  way["railway"="tram"](${bbox});
  node["shop"](${bbox});
  node["amenity"~"pub|bar|fast_food|restaurant|bicycle_rental"](${bbox});
  node["bicycle_rental"](${bbox});
);out geom;`;
const hosts = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];
let data;
for (const host of hosts) {
  try {
    console.log('Downloading OpenStreetMap snapshot from', host);
    const response = await fetch(host, {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'LastOrdersGame/0.3 (github.com/adamkerekhu/KulturalisDigitalisPolgariKor)'},
      body:new URLSearchParams({data:query}),
      signal:AbortSignal.timeout(45000)
    });
    if (!response.ok) throw Error('HTTP '+response.status);
    const json=await response.json();
    const elements=json.elements?.filter(e=>
      (e.type==='way' && Array.isArray(e.geometry) && (e.tags?.highway || e.tags?.building || e.tags?.railway==='tram')) ||
      (e.type==='node' && Number.isFinite(e.lat) && Number.isFinite(e.lon) && e.tags)
    )||[];
    const roadCount=elements.filter(e=>e.tags?.highway).length;
    const buildingCount=elements.filter(e=>e.tags?.building).length;
    if(roadCount<25 || buildingCount<50)throw Error('Unexpectedly small extract: '+roadCount+' roads '+buildingCount+' buildings');
    data={source:'OpenStreetMap contributors · ODbL', attribution:'© OpenStreetMap contributors',
      attributionURL:'https://www.openstreetmap.org/copyright',
      bbox:[47.4754,19.0665,47.4840,19.0791],
      generatedAt:new Date().toISOString(), elements};
    console.log('Extracted',elements.length,'features including',roadCount,'roads and',buildingCount,'buildings');
    break;
  } catch(error){console.warn('Attempt failed:',host,String(error));}
}
if(!data){
  // Never overwrite a valid committed map with an empty fallback.
  console.error('Could not import OpenStreetMap data; existing map snapshot unchanged.');
  process.exit(1);
}
await mkdir('public',{recursive:true});
await writeFile('public/osm-map.json',JSON.stringify(data));
console.log('Wrote permanent map snapshot: public/osm-map.json');
