import Phaser from 'phaser';
import type { Rectangle } from './map';

export type GeoPoint = { lat: number; lon: number };
export type OSMElement = { type: 'way'|'node'; id: number; tags?: Record<string,string>; lat?: number; lon?: number; geometry?: GeoPoint[] };
export type OSMMap = { bbox?: number[]; elements: OSMElement[]; error?: string; attribution?: string };
export type RoadSegment = { ax:number; ay:number; bx:number; by:number; width:number; kind:string };
const BOUNDS = { north:47.4840, south:47.4754, west:19.0665, east:19.0791 };
export const mapToWorld=(lat:number,lon:number)=>({
  x:(lon-BOUNDS.west)/(BOUNDS.east-BOUNDS.west)*2000,
  y:(BOUNDS.north-lat)/(BOUNDS.north-BOUNDS.south)*2000
});
const roadWidth=(kind:string):number=>kind==='primary'?35:kind==='secondary'?32:kind==='tertiary'?29:kind==='residential'?26:kind==='living_street'?19:kind==='service'?16:kind==='pedestrian'?14:kind==='cycleway'?10:kind==='footway'?9:kind==='path'?8:kind==='steps'?6:20;
const driveable=(kind:string)=>!['pedestrian','footway','path','cycleway','steps','construction','proposed','corridor','bridleway','track'].includes(kind);
export function getRoadSegments(map:OSMMap):RoadSegment[]{
  const segments:RoadSegment[]=[];
  for(const e of map.elements){
    if(e.type!=='way'||!e.tags?.highway||!driveable(e.tags.highway)||!e.geometry)continue;
    const p=e.geometry.map(g=>mapToWorld(g.lat,g.lon));
    const width=roadWidth(e.tags.highway);
    for(let i=1;i<p.length;i++){
      if(Math.hypot(p[i].x-p[i-1].x,p[i].y-p[i-1].y)>0.4)
        segments.push({ax:p[i-1].x,ay:p[i-1].y,bx:p[i].x,by:p[i].y,width,kind:e.tags.highway});
    }
  }
  return segments;
}
export function nearestRoad(x:number,y:number,segments:RoadSegment[]):{x:number;y:number;distance:number;angle:number;width:number}|null{
  let best:{x:number;y:number;distance:number;angle:number;width:number}|null=null;
  for(const s of segments){
    const dx=s.bx-s.ax,dy=s.by-s.ay,len2=dx*dx+dy*dy;
    if(len2<.001)continue;
    const t=Phaser.Math.Clamp(((x-s.ax)*dx+(y-s.ay)*dy)/len2,0,1);
    const px=s.ax+t*dx,py=s.ay+t*dy,dist=Math.hypot(px-x,py-y);
    if(!best||dist<best.distance)best={x:px,y:py,distance:dist,angle:Math.atan2(dx,-dy),width:s.width};
  }
  return best;
}
export function onDriveableRoad(x:number,y:number,segments:RoadSegment[],margin=5):boolean{
  const near=nearestRoad(x,y,segments);
  return !!near && near.distance<=near.width/2+margin;
}
function text(scene:Phaser.Scene,value:string,x:number,y:number,size=15,color='#f9eed7',depth=-20){
  scene.add.text(x,y,value,{fontFamily:'Arial,sans-serif',fontSize:size+'px',color,fontStyle:'bold',stroke:'#142a27',strokeThickness:3}).setOrigin(.5).setDepth(depth);
}
function noise(n:number):number { const v=Math.sin(n*78.233+23.171)*43758.5453; return v-Math.floor(v); }
function roofDetail(g:Phaser.GameObjects.Graphics,p:Phaser.Math.Vector2[],buildingId:number):void{
  const xs=p.map(a=>a.x),ys=p.map(a=>a.y),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
  if(w<13||h<13)return;
  // Roofline, wall thickness, gutters and a long soft cast shadow give the flat footprints depth.
  g.fillStyle(0x12261f,.28);g.fillPoints(p.map(a=>new Phaser.Math.Vector2(a.x+7,a.y+9)),true);
  const materials=[0xcbb39a,0xbda68d,0x9faaa4,0xa99c8d,0x947f73,0xc7bdab];
  g.fillStyle(materials[buildingId%materials.length]);g.fillPoints(p,true);
  g.lineStyle(2,0x4c554d,.9).strokePoints(p,true,false);
  const inset=Math.min(7,Math.min(w,h)*.15);
  g.lineStyle(1,0xf3e2c2,.43).strokeRect(x+inset,y+inset,Math.max(1,w-2*inset),Math.max(1,h-2*inset));
  // Roof seams follow the dominant building direction; deterministic rather than random every frame.
  g.lineStyle(1,0x6b6560,.44);
  if(w>h){
    g.lineBetween(x+inset,y+h/2,x+w-inset,y+h/2);
    if(h>25)g.lineBetween(x+inset,y+h/2-4,x+w-inset,y+h/2-4);
  }else{
    g.lineBetween(x+w/2,y+inset,x+w/2,y+h-inset);
    if(w>25)g.lineBetween(x+w/2+4,y+inset,x+w/2+4,y+h-inset);
  }
  // Chimneys, skylights, vents; only add details when the roof is large enough.
  if(w>26&&h>23){
    const n=1+Math.floor(noise(buildingId)*3);
    for(let i=0;i<n;i++){
      const xx=x+inset+5+noise(buildingId+i*13)*Math.max(1,w-2*inset-15);
      const yy=y+inset+5+noise(buildingId+i*29)*Math.max(1,h-2*inset-15);
      g.fillStyle(0x334346,.37).fillRect(xx+2,yy+3,8,7);
      g.fillStyle(i%2?0x677975:0x7b5545).fillRect(xx,yy,7,6);
      g.lineStyle(1,0xddc7a8).strokeRect(xx,yy,7,6);
    }
  }
}
export function drawOSMMap(scene:Phaser.Scene,map:OSMMap):Rectangle[]{
  const g=scene.add.graphics().setDepth(-50);
  g.fillStyle(0x657c69).fillRect(0,0,2000,2000);
  const ways=map.elements.filter(e=>e.type==='way'&&e.geometry&&e.geometry.length>1);
  const roads=ways.filter(e=>e.tags?.highway);
  const trams=ways.filter(e=>e.tags?.railway==='tram');
  for(const road of roads){
    const pts=road.geometry!.map(p=>mapToWorld(p.lat,p.lon));
    const kind=road.tags!.highway, w=roadWidth(kind);
    const walking=['pedestrian','footway','path','cycleway','steps'].includes(kind);
    g.lineStyle(w+10,walking?0xc0b69e:0xb0b1a7).strokePoints(pts,false,false);
    g.lineStyle(w,walking?0xb9a890:0x364448).strokePoints(pts,false,false);
    // Dash marks on major roads, scaled so they're visible at GTA2 camera distances.
    if(!walking && ['primary','secondary','tertiary','residential'].includes(kind)){
      g.lineStyle(1,0xd6c89c,.55);
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1],b=pts[i],len=Phaser.Math.Distance.Between(a.x,a.y,b.x,b.y);
        for(let d=5;d<len;d+=18){
          const t=d/len,u=Math.min(len,d+7)/len;
          g.lineBetween(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u);
        }
      }
    }
  }
  for(const tram of trams){
    const pts=tram.geometry!.map(p=>mapToWorld(p.lat,p.lon));
    g.lineStyle(7,0xb2aa95,.9).strokePoints(pts,false,false);
    g.lineStyle(2,0x435457).strokePoints(pts,false,false);
  }
  const collisions:Rectangle[]=[];
  for(const b of ways.filter(e=>e.tags?.building)){
    const p=b.geometry!.map(q=>new Phaser.Math.Vector2(mapToWorld(q.lat,q.lon).x,mapToWorld(q.lat,q.lon).y));
    if(p.length<3)continue;
    const xs=p.map(q=>q.x),ys=p.map(q=>q.y),x=Math.min(...xs),y=Math.min(...ys);
    const w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    if(x>2000||y>2000||x+w<0||y+h<0)continue;
    roofDetail(g,p,b.id);
    // Conservative bounding rectangles preserve existing Arcade Physics; courtyard interiors remain a known limitation.
    if(w>14&&h>14&&w<350&&h<350)collisions.push({x:x+3,y:y+3,w:w-6,h:h-6});
  }
  // Streetscape: lampposts near road centerlines, with static shadows.
  const mains=getRoadSegments(map).filter(s=>['primary','secondary','tertiary','residential'].includes(s.kind));
  let placed=0;
  for(const s of mains){
    if(placed>420)break;
    const dx=s.bx-s.ax,dy=s.by-s.ay,len=Math.hypot(dx,dy);
    if(len<36)continue;
    const nx=-dy/len,ny=dx/len;
    for(let d=27;d<len;d+=85){
      const x=s.ax+dx*(d/len)+nx*(s.width/2+7),y=s.ay+dy*(d/len)+ny*(s.width/2+7);
      if(x<10||y<10||x>1990||y>1990)continue;
      g.fillStyle(0x213e39,.35).fillEllipse(x+3,y+4,8,4);
      g.fillStyle(0x384b4b).fillCircle(x,y,2.4);
      g.fillStyle(0xf9e0a5).fillCircle(x,y,1.2);
      placed++;
    }
  }
  const spots:Array<{name:string;lat:number;lon:number;type:string}>=[];
  for(const e of map.elements){
    const n=e.tags?.name||'';
    if(e.type!=='node'||e.lat==null||e.lon==null)continue;
    if(/maestro/i.test(n))spots.push({name:'MAESTRO PUB',lat:e.lat,lon:e.lon,type:'pub'});
    else if(/mester gyros/i.test(n))spots.push({name:'MESTER GYROS',lat:e.lat,lon:e.lon,type:'gyros'});
    else if(/spar/i.test(n)&&e.tags?.shop)spots.push({name:'SPAR',lat:e.lat,lon:e.lon,type:'spar'});
    else if(/dohánybolt/i.test(n))spots.push({name:'DOHÁNYBOLT',lat:e.lat,lon:e.lon,type:'tobacco'});
    else if(/bubi/i.test(n))spots.push({name:'MOL BUBI',lat:e.lat,lon:e.lon,type:'bike'});
  }
  for(const fixed of [
    {name:'MAESTRO PUB',lat:47.47857,lon:19.07400,type:'pub'},
    {name:'SPAR',lat:47.4784266,lon:19.0742364,type:'spar'}
  ])if(!spots.some(s=>s.type===fixed.type && Math.hypot(s.lat-fixed.lat,s.lon-fixed.lon)<.0003))spots.push(fixed);
  const icons:Record<string,string>={pub:'🍺',gyros:'🥙',spar:'🛒',tobacco:'🚬',bike:'🚲'};
  for(const p of spots){
    const {x,y}=mapToWorld(p.lat,p.lon);
    g.fillStyle(p.type==='pub'?0xf4ba60:0xf7d982).fillCircle(x,y,5);
    g.lineStyle(1,0x334b43).strokeCircle(x,y,5);
    text(scene,(icons[p.type]||'•')+' '+p.name,x,y-18,p.type==='pub'?13:11);
  }
  const at=document.getElementById('attribution');
  if(at)at.textContent='© OPENSTREETMAP CONTRIBUTORS · ODbL · STYLIZED GAME WORLD';
  return collisions;
}
