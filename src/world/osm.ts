import Phaser from 'phaser';
import type { Rectangle } from './map';

type Point = { lat:number; lon:number };
type Element = { type:'way'|'node'; id:number; tags?:Record<string,string>; lat?:number; lon?:number; geometry?:Point[] };
export type OSMMap = { bbox?:number[]; elements:Element[]; error?:string; attribution?:string };
const BOUNDS = {south:47.4754,west:19.0665,north:47.4840,east:19.0791};
export const mapToWorld = (lat:number,lon:number) => ({
  x:(lon-BOUNDS.west)/(BOUNDS.east-BOUNDS.west)*2000,
  y:(BOUNDS.north-lat)/(BOUNDS.north-BOUNDS.south)*2000
});
const label=(scene:Phaser.Scene,value:string,x:number,y:number,size=15,color='#eaf6e8')=>{
  scene.add.text(x,y,value,{fontFamily:'Arial, sans-serif',fontSize:size+'px',fontStyle:'bold',color,stroke:'#172e2a',strokeThickness:4}).setOrigin(.5).setDepth(-30);
};
const safeName=(s:string)=>s.replace(/[<>]/g,'').slice(0,32);

export function drawOSMMap(scene:Phaser.Scene, map:OSMMap):Rectangle[] {
  const g=scene.add.graphics().setDepth(-50);
  g.fillStyle(0x53715e).fillRect(0,0,2000,2000);
  const ways=map.elements.filter(e=>e.type==='way'&&e.geometry&&e.geometry.length>1);
  const polygonWays=ways.filter(e=>e.tags?.building);
  const roads=ways.filter(e=>e.tags?.highway);
  const trams=ways.filter(e=>e.tags?.railway==='tram');

  // Real streets are drawn from OSM ways; no live tile requests are made.
  for(const road of roads){
    const kind=road.tags?.highway||'';
    const width=kind==='primary'?29:kind==='secondary'?26:kind==='tertiary'?22:
      kind==='residential'?19:kind==='service'?12:
      ['footway','pedestrian','path','steps','cycleway'].includes(kind)?7:15;
    const pts=road.geometry!.map(p=>mapToWorld(p.lat,p.lon));
    g.lineStyle(width+8,0xabb0a1).strokePoints(pts,false,false);
    const color=['footway','pedestrian','path','steps','cycleway'].includes(kind)?0xb5a98f:0x3c4849;
    g.lineStyle(width,color).strokePoints(pts,false,false);
  }
  for(const tram of trams){
    const pts=tram.geometry!.map(p=>mapToWorld(p.lat,p.lon));
    g.lineStyle(8,0xb6b3a2).strokePoints(pts,false,false);
    g.lineStyle(2,0x474e50).strokePoints(pts,false,false);
  }

  const collisions:Rectangle[]=[];
  let i=0;
  for(const building of polygonWays){
    const p=building.geometry!.map(q=>mapToWorld(q.lat,q.lon));
    if(p.length<3)continue;
    const minX=Math.min(...p.map(q=>q.x)),maxX=Math.max(...p.map(q=>q.x));
    const minY=Math.min(...p.map(q=>q.y)),maxY=Math.max(...p.map(q=>q.y));
    if(maxX<0||minX>2000||maxY<0||minY>2000)continue;
    g.fillStyle(i%4===0?0xb8a58b:i%4===1?0x9b9b91:i%4===2?0xa89c89:0xc0ab93);
    g.fillPoints(p,true);
    g.lineStyle(2,0x4c544e).strokePoints(p,true,false);
    // Approximate rectangular physics footprint; polygonal collision is a later refinement.
    const w=maxX-minX,h=maxY-minY;
    if(w>18&&h>18&&w<400&&h<400){
      collisions.push({x:minX+3,y:minY+3,w:w-6,h:h-6});
    }
    i++;
  }

  const tagged=map.elements.filter(e=>e.type==='node'&&e.tags?.name);
  const spots: Array<{name:string;lat:number;lon:number;icon:string}> = [];
  for(const node of tagged){
    const name=node.tags?.name||'';
    if(/maestro/i.test(name))spots.push({name:'🍺 MAESTRO PUB',lat:node.lat!,lon:node.lon!,icon:'pub'});
    else if(/mester gyros/i.test(name))spots.push({name:'🥙 MESTER GYROS',lat:node.lat!,lon:node.lon!,icon:'gyros'});
    else if(/spar/i.test(name)&&node.tags?.shop)spots.push({name:'🛒 '+safeName(name),lat:node.lat!,lon:node.lon!,icon:'spar'});
    else if(/nemzeti dohánybolt|dohánybolt/i.test(name))spots.push({name:'🚬 DOHÁNYBOLT',lat:node.lat!,lon:node.lon!,icon:'tobacco'});
    else if(/bubi/i.test(name))spots.push({name:'🚲 MOL BUBI',lat:node.lat!,lon:node.lon!,icon:'bubi'});
  }
  const fixed=[
    {name:'🍺 MAESTRO PUB',lat:47.47857,lon:19.07400,icon:'pub'},
    {name:'🛒 SPAR MARKET',lat:47.4784266,lon:19.0742364,icon:'spar'}
  ];
  for(const p of fixed)if(!spots.some(s=>s.icon===p.icon&&Math.hypot(s.lat-p.lat,s.lon-p.lon)<.0003))spots.push(p);
  // Mester Gyros/tobacco/Bubi are only pinned if present in extracted OSM data.
  for(const spot of spots){
    const {x,y}=mapToWorld(spot.lat,spot.lon);
    g.fillStyle(0xffd477).fillCircle(x,y,9);
    g.lineStyle(2,0x253c35).strokeCircle(x,y,9);
    label(scene,spot.name,x,y-26,16);
  }
  label(scene,'MESTER UTCA',900,1000,24);
  const a=document.getElementById('attribution');
  if(a)a.textContent='© OPENSTREETMAP CONTRIBUTORS · ODbL · STYLIZED GAME RENDERING';
  return collisions;
}
