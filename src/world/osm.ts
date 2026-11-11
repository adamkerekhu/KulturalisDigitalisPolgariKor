// OpenStreetMap JSON schema. Geographic projection, roads, buildings and collisions
// are handled by geo.ts; world artwork is handled by CityRenderer.ts.
export type OSMPoint={lat:number;lon:number};
export type OSMElement={
  type:'way'|'node';
  id:number;
  tags?:Record<string,string>;
  lat?:number;
  lon?:number;
  geometry?:OSMPoint[];
};
export type OSMMap={
  bbox?:number[];
  generatedAt?:string;
  source?:string;
  attribution?:string;
  error?:string;
  elements:OSMElement[];
};
