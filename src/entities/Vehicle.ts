import Phaser from 'phaser';
import { circleHitsBuildings, isOnDrivableRoad, WORLD_HEIGHT, WORLD_WIDTH, type CityGeometry, type Vec2 } from '../world/geo';
export type VehicleKind='car'|'bike';
export class Vehicle {
 readonly sprite:Phaser.GameObjects.Image;
 speed=0;
 private wheelTurn=0;
 constructor(scene:Phaser.Scene,readonly kind:VehicleKind,x:number,y:number){
  this.sprite=scene.add.image(x,y,kind==='car'?'red-car':'green-bike')
    .setScale(kind==='car'?.215:.14).setDepth(27);
 }
 get position():Vec2{return {x:this.sprite.x,y:this.sprite.y};}
 get x():number{return this.sprite.x;}
 get y():number{return this.sprite.y;}
 get angle():number{return this.sprite.rotation;}
 setPosition(x:number,y:number,angle=0):void{this.sprite.setPosition(x,y).setRotation(angle);}
 update(inputX:number,inputY:number,dt:number,city:CityGeometry):void{
  const car=this.kind==='car',max=car?110:44,acceleration=car?82:45;
  if(inputY<-.1)this.speed+=acceleration*dt;
  else if(inputY>.1)this.speed-=acceleration*dt*(this.speed>0?1.65:.65);
  else this.speed*=Math.max(0,1-(car?1.35:2)*dt);
  this.speed=Phaser.Math.Clamp(this.speed,-max*.33,max);
  const steer=Phaser.Math.Clamp(inputX,-1,1);
  const moving=Math.abs(this.speed)>1;
  if(moving){
   this.wheelTurn=Phaser.Math.Linear(this.wheelTurn,steer,Math.min(1,dt*5));
   const grip=Phaser.Math.Clamp(Math.abs(this.speed)/(car?34:15),.2,1);
   this.sprite.rotation+=this.wheelTurn*(car?2.0:2.6)*dt*grip*Math.sign(this.speed);
  }
  const px=this.x+Math.sin(this.angle)*this.speed*dt;
  const py=this.y-Math.cos(this.angle)*this.speed*dt;
  const halfW=car?5.8:2.3,halfL=car?11:5.6;
  const blocked=(p:Vec2)=>p.x<0||p.y<0||p.x>WORLD_WIDTH||p.y>WORLD_HEIGHT||circleHitsBuildings(p,car?2:1.1,city.buildings);
  const fw={x:Math.sin(this.angle),y:-Math.cos(this.angle)};
  const side={x:Math.cos(this.angle),y:Math.sin(this.angle)};
  const corners=[-1,1].flatMap(f=>[-1,1].map(s=>({x:px+fw.x*halfL*f+side.x*halfW*s,y:py+fw.y*halfL*f+side.y*halfW*s})));
  if(corners.some(blocked)){this.speed*=-.08;return;}
  // Road aware: off-road driving is slow. Streets, service roads and crossing junctions are usable.
  if(!isOnDrivableRoad({x:px,y:py},city.segments,car?9:12)){
   this.speed*=Math.max(0,1-(car?5.5:2.8)*dt);
   if(car&&Math.abs(this.speed)>40)return;
  }
  this.sprite.setPosition(px,py);
 }
}
