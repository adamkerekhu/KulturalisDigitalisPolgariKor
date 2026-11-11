import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Vehicle } from '../entities/Vehicle';
import { drawCity } from '../world/CityRenderer';
import { parseCity, project, nearestRoad, findWalkableNear, circleHitsBuildings, WORLD_WIDTH, WORLD_HEIGHT, type CityGeometry, type Vec2 } from '../world/geo';
import type { OSMMap } from '../world/osm';

type Controls={W:Phaser.Input.Keyboard.Key;A:Phaser.Input.Keyboard.Key;S:Phaser.Input.Keyboard.Key;D:Phaser.Input.Keyboard.Key;UP:Phaser.Input.Keyboard.Key;DOWN:Phaser.Input.Keyboard.Key;LEFT:Phaser.Input.Keyboard.Key;RIGHT:Phaser.Input.Keyboard.Key;SHIFT:Phaser.Input.Keyboard.Key;E:Phaser.Input.Keyboard.Key;R:Phaser.Input.Keyboard.Key;PLUS:Phaser.Input.Keyboard.Key;MINUS:Phaser.Input.Keyboard.Key};
const hud=(key:string,value:string)=>{const el=document.getElementById(key);if(el)el.textContent=value;};
export class StreetScene extends Phaser.Scene {
 private city:CityGeometry|null=null;
 private player!:Player;
 private car!:Vehicle;
 private bicycle!:Vehicle;
 private active:Vehicle|null=null;
 private keys!:Controls;
 private target!:Phaser.GameObjects.Zone;
 private baseZoom=3.1;
 private joystick={x:0,y:0};
 private mobileAction=false;
 private toastHandle?:ReturnType<typeof setTimeout>;
 private ready=false;
 private hint!:Phaser.GameObjects.Text;
 private spawnPoint:Vec2={x:0,y:0};
 constructor(){super('StreetScene');}
 create():void{
  this.makeTextures();
  this.physics.world.setBounds(0,0,WORLD_WIDTH,WORLD_HEIGHT);
  this.cameras.main.setBounds(0,0,WORLD_WIDTH,WORLD_HEIGHT);
  this.baseZoom=innerWidth<700?2.35:3.1;
  this.cameras.main.setZoom(this.baseZoom);
  this.keys=this.input.keyboard!.addKeys({
   W:'W',A:'A',S:'S',D:'D',UP:'UP',DOWN:'DOWN',LEFT:'LEFT',RIGHT:'RIGHT',SHIFT:'SHIFT',E:'E',R:'R',PLUS:'PLUS',MINUS:'MINUS'
  }) as Controls;
  this.input.keyboard?.on('keydown-E',(ev:KeyboardEvent)=>{if(!ev.repeat&&this.ready)this.interact();});
  this.input.keyboard?.on('keydown-R',(ev:KeyboardEvent)=>{if(!ev.repeat&&this.ready)this.rescuePlayer();});
  this.input.keyboard?.on('keydown-PLUS',()=>{this.baseZoom=Phaser.Math.Clamp(this.baseZoom+.2,1.2,5.5);});
  this.input.keyboard?.on('keydown-MINUS',()=>{this.baseZoom=Phaser.Math.Clamp(this.baseZoom-.2,1.2,5.5);});
  this.configureTouch();
  this.toast('Loading the real Mester utca map...');
  void this.initialize();
 }
 private async initialize():Promise<void>{
  try{
   const response=await fetch('/osm-map.json');
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json() as OSMMap;
   if(!data.elements||data.elements.length<100)throw Error('Incomplete OSM snapshot');
   this.city=parseCity(data);
   if(this.city.buildings.length<50||this.city.segments.length<50)throw Error('The map does not contain valid streets and buildings');
   drawCity(this,this.city);
   const pub=project(47.47857,19.074);
   const road=nearestRoad(pub,this.city.segments);
   const base=road?.point||pub;
   const sidewalk=road?{x:base.x+Math.cos(road.angle)*(road.width/2+13),y:base.y+Math.sin(road.angle)*(road.width/2+13)}:pub;
   const spawn=findWalkableNear(sidewalk,this.city);
   this.spawnPoint=spawn;
   this.player=new Player(this,spawn.x,spawn.y);
   const carStreet=nearestRoad({x:pub.x-27,y:pub.y+30},this.city.segments)||road;
   const bikeStreet=nearestRoad({x:pub.x+36,y:pub.y+18},this.city.segments)||road;
   const carpos=carStreet?.point||{x:pub.x-40,y:pub.y+40};
   const bikepos=bikeStreet?.point||{x:pub.x+35,y:pub.y+15};
   this.car=new Vehicle(this,'car',carpos.x,carpos.y);
   this.car.setPosition(carpos.x,carpos.y,carStreet?.angle||0);
   this.bicycle=new Vehicle(this,'bike',bikepos.x,bikepos.y);
   this.bicycle.setPosition(bikepos.x,bikepos.y,bikeStreet?.angle||0);
   this.target=this.add.zone(spawn.x,spawn.y,1,1).setDepth(-90);
   this.cameras.main.startFollow(this.target,true,.115,.115);
   this.hint=this.add.text(0,0,'',{fontFamily:'Arial,sans-serif',fontSize:'10px',fontStyle:'bold',color:'#f9e5b5',stroke:'#182922',strokeThickness:3}).setOrigin(.5).setDepth(50);
   this.ready=true;
   hud('status','🚶 ON FOOT');
   this.toast('Mester utca ready. Find Maestro, drive the car, or ride the Bubi!');
  }catch(err){
   const message=err instanceof Error?err.message:String(err);
   console.error('Map initialization failed',err);
   this.add.text(innerWidth/2,innerHeight/2,'Map failed to load. Refresh the page.\n'+message,{fontSize:'20px',color:'#ffffff',backgroundColor:'#193632',align:'center',padding:{x:18,y:18}}).setScrollFactor(0).setOrigin(.5);
   this.toast('Game map unavailable: '+message);
  }
 }
 private makeTextures():void{
  const g=this.make.graphics({x:0,y:0});
  for(const dir of ['up','down','left','right']){
   g.clear();g.fillStyle(0x27333d).fillRoundedRect(8,30,9,15,2).fillRoundedRect(20,30,9,15,2);
   g.fillStyle(0x25677e).fillRoundedRect(3,15,31,24,6);
   g.fillStyle(0xe9b994).fillCircle(18,13,12);
   g.fillStyle(0x43322a).fillEllipse(18,4,24,9);
   g.fillStyle(0x223139);
   if(dir==='down')g.fillRect(11,12,4,3).fillRect(21,12,4,3);
   if(dir==='up')g.fillRect(13,9,10,2);
   if(dir==='left')g.fillRect(7,12,4,3);
   if(dir==='right')g.fillRect(25,12,4,3);
   g.generateTexture('player-'+dir,37,49);
  }
  g.clear();
  g.fillStyle(0x1d2527);
  for(const x of [0,53])for(const y of [11,73])g.fillRoundedRect(x,y,9,19,3);
  g.fillStyle(0xbb463d).fillRoundedRect(5,2,51,96,10);
  g.fillStyle(0xe27d67).fillRoundedRect(9,4,43,8,3);
  g.fillStyle(0x23343c).fillRoundedRect(12,24,37,45,6);
  g.fillStyle(0x52606a).fillRect(16,30,28,5);
  g.fillStyle(0xfee9ac).fillRect(10,8,10,5).fillRect(41,8,10,5);
  g.generateTexture('red-car',61,103);
  g.clear();
  g.lineStyle(4,0x1d2c2c).strokeCircle(22,15,12).strokeCircle(22,72,12);
  g.lineStyle(5,0x6cde8b).lineBetween(22,15,8,44).lineBetween(8,44,22,72).lineBetween(22,72,37,44).lineBetween(37,44,22,15);
  g.generateTexture('green-bike',44,87);g.destroy();
 }
 private configureTouch():void{
  const pad=document.getElementById('pad'),knob=document.getElementById('knob');
  let pointer:number|null=null;
  if(pad&&knob){
   const move=(ev:PointerEvent)=>{
    const rect=pad.getBoundingClientRect(),dx=ev.clientX-rect.left-rect.width/2,dy=ev.clientY-rect.top-rect.height/2;
    const len=Math.max(1,Math.hypot(dx,dy)),distance=Math.min(35,len);
    this.joystick.x=dx/Math.max(35,len);this.joystick.y=dy/Math.max(35,len);
    knob.style.transform='translate('+dx/len*distance+'px,'+dy/len*distance+'px)';
   };
   pad.addEventListener('pointerdown',ev=>{pointer=ev.pointerId;pad.setPointerCapture(pointer);move(ev);});
   pad.addEventListener('pointermove',ev=>{if(ev.pointerId===pointer)move(ev);});
   const stop=()=>{pointer=null;this.joystick.x=this.joystick.y=0;knob.style.transform='';};
   pad.addEventListener('pointerup',stop);pad.addEventListener('pointercancel',stop);
  }
  document.getElementById('interact')?.addEventListener('pointerdown',ev=>{ev.preventDefault();this.mobileAction=true;});
 }
 private toast(message:string):void{
  const el=document.getElementById('toast');if(!el)return;
  el.textContent=message;el.style.opacity='1';
  if(this.toastHandle)clearTimeout(this.toastHandle);
  this.toastHandle=setTimeout(()=>el.style.opacity='0',3500);
 }
 private getInteraction():{label:string;type:'car'|'bike'|'poi';distance:number}|null{
  if(!this.city)return null;
  const p=this.player.position;
  const items:Array<{label:string;type:'car'|'bike'|'poi';distance:number}>=[
   {label:'DRIVE CAR',type:'car' as const,distance:Phaser.Math.Distance.Between(p.x,p.y,this.car.x,this.car.y)},
   {label:'RIDE BUBI',type:'bike' as const,distance:Phaser.Math.Distance.Between(p.x,p.y,this.bicycle.x,this.bicycle.y)}
  ];
  for(const loc of this.city.pois)items.push({label:loc.name,type:'poi' as const,distance:Phaser.Math.Distance.Between(p.x,p.y,loc.point.x,loc.point.y)});
  items.sort((a,b)=>a.distance-b.distance);
  const result=items[0];
  return result&&result.distance<(result.type==='poi'?45:35)?result:null;
 }
 private rescuePlayer():void{
  if(!this.city)return;
  if(this.active){this.active.speed=0;this.active=null;this.player.setVisible(true);}
  // Recalculate from real road geometry, never use the pub's building coordinate.
  const safe=findWalkableNear(this.spawnPoint,this.city);
  this.player.setPosition(safe.x,safe.y);
  hud('status','🚶 ON FOOT');
  this.target.setPosition(safe.x,safe.y);
  this.toast('Rescued! You are back on the pavement near Maestro.');
 }
 private interact():void{
  if(!this.city||!this.ready)return;
  if(this.active){
   const car=this.active,p=car.position,dir=car.angle;
   const side={x:Math.cos(dir),y:Math.sin(dir)};
   const candidates=[14,-14,21,-21].map(m=>({x:p.x+side.x*m,y:p.y+side.y*m}));
   const pos=candidates.find(v=>v.x>7&&v.y>7&&v.x<WORLD_WIDTH-7&&v.y<WORLD_HEIGHT-7&&!circleHitsBuildings(v,5,this.city!.buildings));
   if(!pos){this.toast('No clear space to exit here. Drive forward.');return;}
   this.active=null;
   this.player.setPosition(pos.x,pos.y);
   this.player.setVisible(true);
   car.speed=0;
   hud('status','🚶 ON FOOT');
   this.toast('Back on foot.');
   return;
  }
  const interaction=this.getInteraction();
  if(!interaction){this.toast('Get closer to the vehicle or shop.');return;}
  if(interaction.type==='poi'){this.toast(interaction.label+' · Building interiors are coming later.');return;}
  this.active=interaction.type==='car'?this.car:this.bicycle;
  this.player.setVisible(false);
  hud('status',this.active.kind==='car'?'🚗 DRIVING':'🚲 MOL BUBI');
  this.toast('W/↑ accelerate · S/↓ brake/reverse · A/D steer · E exit');
 }
 update(_time:number,delta:number):void{
  if(!this.ready||!this.city)return;
  const dt=Math.min(.04,delta/1000);
  const x=Number(this.keys.D.isDown||this.keys.RIGHT.isDown)-Number(this.keys.A.isDown||this.keys.LEFT.isDown)+this.joystick.x;
  const y=Number(this.keys.S.isDown||this.keys.DOWN.isDown)-Number(this.keys.W.isDown||this.keys.UP.isDown)+this.joystick.y;
  if(this.mobileAction){this.mobileAction=false;this.interact();}
  if(this.active)this.active.update(x,y,dt,this.city);
  else this.player.move(x,y,this.keys.SHIFT.isDown,dt,this.city);
  const position=this.active?.position||this.player.position;
  const lead=this.active?Math.min(35,Math.max(-20,this.active.speed*.30)):0;
  const point={x:position.x+(this.active?Math.sin(this.active.angle)*lead:0),y:position.y-(this.active?Math.cos(this.active.angle)*lead:0)};
  this.target.setPosition(Phaser.Math.Linear(this.target.x,point.x,Math.min(1,dt*8)),Phaser.Math.Linear(this.target.y,point.y,Math.min(1,dt*8)));
  const zoom=this.active?(this.active.kind==='car'?this.baseZoom*.68:this.baseZoom*.84):this.baseZoom;
  this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom,zoom,Math.min(1,dt*3.5)));
  const nearby=this.active?null:this.getInteraction();
  hud('nearby',this.active?'W forward · S brake/reverse · A/D steer · E exit':nearby?nearby.label+' · Press E to interact':'Explore Mester utca · E to interact');
  if(this.active){this.hint.setVisible(false);}
  else if(nearby){
   let target:Vec2=this.player.position;
   if(nearby.type==='car')target=this.car.position;
   if(nearby.type==='bike')target=this.bicycle.position;
   if(nearby.type==='poi'){
    const p=this.city.pois.find(q=>q.name===nearby.label);
    if(p)target=p.point;
   }
   this.hint.setPosition(target.x,target.y-15).setText('E').setVisible(true);
  }else this.hint.setVisible(false);
 }
}
