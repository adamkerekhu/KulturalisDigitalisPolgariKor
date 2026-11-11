import Phaser from 'phaser';
import type { OSMMap } from './osm';

export const METERS_TO_PIXELS = 5;
const north=47.4840,west=19.0665,latitude=47.4797;
const lonMeters=111320*Math.cos(latitude*Math.PI/180);
const latMeters=111132;
export const WORLD_WIDTH=Math.ceil((19.0791-west)*lonMeters*METERS_TO_PIXELS);
export const WORLD_HEIGHT=Math.ceil((north-47.4754)*latMeters*METERS_TO_PIXELS);
export type Vec2={x:number;y:number};
export type Rectangle={x:number;y:number;w:number;h:number};
export type Building={id:number;points:Vec2[];bounds:Rectangle;tags:Record<string,string>};
export type Road={id:number;kind:string;points:Vec2[];width:number;drivable:boolean};
export type Segment={ax:number;ay:number;bx:number;by:number;width:number;kind:string;drivable:boolean};
export type CityGeometry={buildings:Building[];roads:Road[];segments:Segment[];trams:Vec2[][];pois:{name:string;type:string;point:Vec2}[]};
export function project(lat:number,lon:number):Vec2{
 return {x:(lon-west)*lonMeters*METERS_TO_PIXELS,y:(north-lat)*latMeters*METERS_TO_PIXELS};
}
export function roadMeters(kind:string):number{
 switch(kind){
 case 'primary':return 13;case 'secondary':return 11;case 'tertiary':return 9;
 case 'residential':return 7;case 'living_street':return 5;case 'service':return 4.5;
 case 'pedestrian':return 5;case 'footway':return 2.3;case 'cycleway':return 2.4;
 case 'path':return 1.8;case 'steps':return 1.4;default:return 5.5;
 }
}
const pedestrianOnly=new Set(['footway','pedestrian','path','cycleway','steps','bridleway','corridor','construction','proposed','track']);
export function pointOnPolygon(point:Vec2,p:Vec2[]):boolean{
 let inside=false;
 for(let i=0,j=p.length-1;i<p.length;j=i++){
 const a=p[i],b=p[j];
 if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}
function distanceToSegment(p:Vec2,a:Vec2,b:Vec2):{distance:number;point:Vec2;angle:number}{
 const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
 const t=Phaser.Math.Clamp(len>0?((p.x-a.x)*dx+(p.y-a.y)*dy)/len:0,0,1);
 const pt={x:a.x+t*dx,y:a.y+t*dy};
 return {distance:Math.hypot(p.x-pt.x,p.y-pt.y),point:pt,angle:Math.atan2(dx,-dy)};
}
export function circleHitsBuildings(pos:Vec2,radius:number,buildings:Building[]):boolean{
 for(const b of buildings){
 if(pos.x+radius<b.bounds.x||pos.x-radius>b.bounds.x+b.bounds.w||pos.y+radius<b.bounds.y||pos.y-radius>b.bounds.y+b.bounds.h)continue;
 if(pointOnPolygon(pos,b.points))return true;
 for(let j=0;j<b.points.length;j++){
  if(distanceToSegment(pos,b.points[j],b.points[(j+1)%b.points.length]).distance<radius)return true;
 }
 }
 return false;
}
export function nearestRoad(pos:Vec2,segments:Segment[],drivable=true):{point:Vec2;distance:number;angle:number;width:number}|null{
 let best:{point:Vec2;distance:number;angle:number;width:number}|null=null;
 for(const s of segments){
 if(drivable&&!s.drivable)continue;
 if(Math.abs(pos.x-(s.ax+s.bx)/2)>220+Math.abs(s.ax-s.bx)/2||Math.abs(pos.y-(s.ay+s.by)/2)>220+Math.abs(s.ay-s.by)/2)continue;
 const p=distanceToSegment(pos,{x:s.ax,y:s.ay},{x:s.bx,y:s.by});
 if(!best||p.distance<best.distance)best={point:p.point,distance:p.distance,angle:p.angle,width:s.width};
 }
 return best;
}
export function isOnDrivableRoad(p:Vec2,segments:Segment[],margin=0):boolean{
 const near=nearestRoad(p,segments,true);
 return !!near&&near.distance<=near.width/2+margin;
}
export function parseCity(map:OSMMap):CityGeometry{
 const roads:Road[]=[],buildings:Building[]=[],segments:Segment[]=[],trams:Vec2[][]=[],pois:CityGeometry['pois']=[];
 for(const e of map.elements){
 const tags=e.tags||{};
 if(e.type==='node'){
  if(e.lat==null||e.lon==null)continue;
  const name=tags.name||'';
  let type='';
  if(/maestro/i.test(name))type='pub';else if(/mester gyros/i.test(name))type='gyros';
  else if(/spar/i.test(name)&&tags.shop)type='spar';
  else if(/dohánybolt|tobacco/i.test(name))type='tobacco';
  else if(/bubi/i.test(name))type='bike';
  if(type)pois.push({name,type,point:project(e.lat,e.lon)});
  continue;
 }
 if(!e.geometry||e.geometry.length<2)continue;
 const points=e.geometry.map(p=>project(p.lat,p.lon));
 if(tags.highway){
  const kind=tags.highway,width=roadMeters(kind)*METERS_TO_PIXELS;
  const drivable=!pedestrianOnly.has(kind)&&tags.access!=='private'&&tags.motor_vehicle!=='no';
  roads.push({id:e.id,kind,points,width,drivable});
  for(let i=1;i<points.length;i++)segments.push({ax:points[i-1].x,ay:points[i-1].y,bx:points[i].x,by:points[i].y,width,kind,drivable});
 }
 if(tags.railway==='tram')trams.push(points);
 if(tags.building){
  let poly=points.slice();
  if(poly.length>2&&Math.hypot(poly[0].x-poly[poly.length-1].x,poly[0].y-poly[poly.length-1].y)<.01)poly=poly.slice(0,-1);
  if(poly.length<3)continue;
  const x=Math.min(...poly.map(p=>p.x)),y=Math.min(...poly.map(p=>p.y));
  const w=Math.max(...poly.map(p=>p.x))-x,h=Math.max(...poly.map(p=>p.y))-y;
  if(w>3&&h>3&&w<900&&h<900)buildings.push({id:e.id,points:poly,bounds:{x,y,w,h},tags});
 }
 }
 const fixed=[{name:'Maestro Pub',type:'pub',point:project(47.47857,19.07400)},{name:'SPAR',type:'spar',point:project(47.4784266,19.0742364)}];
 for(const p of fixed)if(!pois.some(q=>q.type===p.type&&Math.hypot(q.point.x-p.point.x,q.point.y-p.point.y)<50))pois.push(p);
 return {buildings,roads,segments,trams,pois};
}
export function findWalkableNear(desired:Vec2,city:CityGeometry):Vec2{
 const step=12;
 for(let ring=0;ring<=24;ring++){
  for(let i=0;i<Math.max(1,ring*12);i++){
   const angle=2*Math.PI*i/Math.max(1,ring*12);
   const p={x:desired.x+Math.cos(angle)*ring*step,y:desired.y+Math.sin(angle)*ring*step};
   if(p.x<10||p.y<10||p.x>WORLD_WIDTH-10||p.y>WORLD_HEIGHT-10)continue;
   if(!circleHitsBuildings(p,5,city.buildings))return p;
  }
 }
 return desired;
}
