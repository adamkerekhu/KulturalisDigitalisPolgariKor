import Phaser from 'phaser';
import type { CityGeometry, Building, Vec2 } from './geo';

function random(id:number,salt=0):number{let v=Math.sin(id*12.9898+salt*78.233)*43758.5453123;return v-Math.floor(v);}
const palettes=[
 {roof:0xb88765,light:0xd5a887,dark:0x7e5e4b},
 {roof:0xa8937a,light:0xcdbda1,dark:0x665e57},
 {roof:0x7c8783,light:0xa2ada8,dark:0x505f5c},
 {roof:0x9b7162,light:0xc19680,dark:0x6d5046},
 {roof:0xb4a798,light:0xd3c8b5,dark:0x78766f},
 {roof:0x777a73,light:0xa0a49b,dark:0x4d5553}
];
function line(g:Phaser.GameObjects.Graphics,a:Vec2,b:Vec2,color:number,width:number,alpha=1):void{
 g.lineStyle(width,color,alpha).lineBetween(a.x,a.y,b.x,b.y);
}
function poly(g:Phaser.GameObjects.Graphics,p:Vec2[],color:number,alpha=1):void{
 g.fillStyle(color,alpha).fillPoints(p.map(v=>new Phaser.Math.Vector2(v.x,v.y)),true);
}
function hit(p:Vec2,poly:Vec2[]):boolean{
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}
function renderBuilding(g:Phaser.GameObjects.Graphics,b:Building):void{
 const p=b.points,colors=palettes[b.id%palettes.length];
 // Offset rear mass. The top keeps the exact mapped polygon; courtyards and concave geometry survive.
 const h=Math.min(16,9+random(b.id)*7);
 poly(g,p.map(q=>({x:q.x+h*.55,y:q.y+h*.75})),0x142628,.30);
 for(let i=0;i<p.length;i++){
  const a=p[i],next=p[(i+1)%p.length];
  const wall=[a,next,{x:next.x+3,y:next.y+8},{x:a.x+3,y:a.y+8}];
  poly(g,wall,colors.dark,.84);
  const length=Math.hypot(next.x-a.x,next.y-a.y);
  if(length>35){
   for(let dist=16;dist<length-10;dist+=16){
    const t=dist/length,xx=a.x+(next.x-a.x)*t,yy=a.y+(next.y-a.y)*t;
    g.fillStyle(0x203438,.65).fillRoundedRect(xx+1,yy+4,4,5,1);
    g.fillStyle(0xd7c99f,.65).fillRect(xx+1,yy+4,2,3);
   }
  }
 }
 poly(g,p,colors.roof);
 g.lineStyle(2.4,colors.dark,.9).strokePoints(p.map(v=>new Phaser.Math.Vector2(v.x,v.y)),true,false);
 // Roof lining: draw ONLY inside polygon. No rectangle bounds rendered across streets.
 const bounds=b.bounds;
 const step=13,dir=random(b.id,9)>.5;
 for(let y=bounds.y+step/2;y<bounds.y+bounds.h;y+=step){
  let run:Vec2|null=null;
  for(let x=bounds.x+step/2;x<bounds.x+bounds.w;x+=3){
   const current={x,y};
   if(hit(current,p)){if(!run)run=current;}
   else if(run){if(x-run.x>8)line(g,run,{x:x-3,y},colors.dark,.17*10,.17);run=null;}
  }
  if(run&&bounds.x+bounds.w-run.x>8)line(g,run,{x:bounds.x+bounds.w-2,y},colors.dark,1,.18);
 }
 // Roof ridge, chosen on dominant axis but clipped to actual roof polygon.
 const mid={x:bounds.x+bounds.w/2,y:bounds.y+bounds.h/2};
 const horizontal=dir?bounds.w>bounds.h:bounds.w>=bounds.h;
 for(let v=-Math.max(bounds.w,bounds.h)/2;v<Math.max(bounds.w,bounds.h)/2;v+=3){
  const a=horizontal?{x:mid.x+v,y:mid.y}:{x:mid.x,y:mid.y+v};
  const c=horizontal?{x:a.x+3,y:a.y}:{x:a.x,y:a.y+3};
  if(hit(a,p)&&hit(c,p))line(g,a,c,colors.light,1.8,.7);
 }
 // Details cannot spill beyond the building polygon.
 const count=Math.min(12,Math.floor((bounds.w*bounds.h)/1000));
 for(let i=0;i<count;i++){
  const point={x:bounds.x+8+random(b.id,i+2)*Math.max(1,bounds.w-16),y:bounds.y+8+random(b.id,i+27)*Math.max(1,bounds.h-16)};
  const size=i%3===0?7:4;
  if(![point,{x:point.x+size,y:point.y},{x:point.x+size,y:point.y+size},{x:point.x,y:point.y+size}].every(q=>hit(q,p)))continue;
  g.fillStyle(colors.dark,.55).fillRect(point.x+2,point.y+2,size,size);
  g.fillStyle(i%3===0?0x657d85:0xcab6a1).fillRect(point.x,point.y,size,size);
  g.lineStyle(.8,colors.light).strokeRect(point.x,point.y,size,size);
 }
}
function roadShape(g:Phaser.GameObjects.Graphics,p:Vec2[],width:number,color:number):void{
 if(p.length<2)return;
 g.lineStyle(width, color).strokePoints(p.map(v=>new Phaser.Math.Vector2(v.x,v.y)),false,false);
}
export function drawCity(scene:Phaser.Scene,city:CityGeometry):void{
 const g=scene.add.graphics().setDepth(-80);
 g.fillStyle(0x5f7765).fillRect(0,0,scene.physics.world.bounds.width,scene.physics.world.bounds.height);
 // Grassed courtyards, paths and regular Budapest street surface.
 for(const r of city.roads){
  roadShape(g,r.points,r.width+(r.drivable?18:6),r.drivable?0xbcb6a5:0xaead91);
 }
 for(const r of city.roads){
  const walkway=['footway','path','pedestrian','cycleway','steps'].includes(r.kind);
  roadShape(g,r.points,r.width,walkway?0xcdbb9d:0x39484a);
  if(r.drivable && r.width>30){
   for(let i=1;i<r.points.length;i++){
    const a=r.points[i-1],b=r.points[i];
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    for(let d=10;d<len;d+=25){
     const t=d/len,u=Math.min(len,d+9)/len;
     line(g,{x:a.x+dx*t,y:a.y+dy*t},{x:a.x+dx*u,y:a.y+dy*u},0xd1c39e,1.2,.6);
    }
   }
  }
 }
 // Tramway at street level, no opaque beige blanket over the road.
 for(const points of city.trams){
  roadShape(g,points,10,0x989888);
  roadShape(g,points,2,0x303d43);
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i];
   const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
   for(let d=4;d<len;d+=10){
    const t=d/len,nx=-dy/len*4,ny=dx/len*4;
    line(g,{x:a.x+dx*t+nx,y:a.y+dy*t+ny},{x:a.x+dx*t-nx,y:a.y+dy*t-ny},0x49483f,1.1);
   }
  }
 }
 for(const b of city.buildings)renderBuilding(g,b);
 // Light street furniture, spatially detached from the roads.
 let count=0;
 for(const r of city.roads){
  if(count>280||r.kind!=='residential')continue;
  for(let i=1;i<r.points.length;i++){
   const a=r.points[i-1],b=r.points[i],len=Math.hypot(b.x-a.x,b.y-a.y);
   if(len<60)continue;
   for(let d=27;d<len;d+=105){
    const x=a.x+(b.x-a.x)*d/len-(b.y-a.y)/len*(r.width/2+8);
    const y=a.y+(b.y-a.y)*d/len+(b.x-a.x)/len*(r.width/2+8);
    if(city.buildings.some(q=>x>q.bounds.x&&x<q.bounds.x+q.bounds.w&&y>q.bounds.y&&y<q.bounds.y+q.bounds.h))continue;
    g.fillStyle(0x1b322f,.4).fillEllipse(x+3,y+4,10,5);
    g.fillStyle(0x3f4d47).fillCircle(x,y,3);
    g.fillStyle(0xfde4a2).fillCircle(x,y,1.7);
    count++;
   }
  }
 }
 const icons:Record<string,string>={pub:'🍺',spar:'🛒',tobacco:'🚬',gyros:'🥙',bike:'🚲'};
 for(const p of city.pois){
  const pt=p.point;
  g.fillStyle(p.type==='pub'?0xf7b65b:0xf8d777).fillCircle(pt.x,pt.y,4);
  scene.add.text(pt.x,pt.y-18,(icons[p.type]||'')+' '+p.name.toUpperCase(),{
   fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',color:'#f7f2d9',
   stroke:'#152a2a',strokeThickness:3
  }).setOrigin(.5).setDepth(-35);
 }
 const at=document.getElementById('attribution');
 if(at)at.textContent='© OPENSTREETMAP CONTRIBUTORS · ODbL · ORIGINAL STYLIZED ROOFTOPS';
}
