import Phaser from 'phaser';
import type { Rectangle } from '../world/map';
import { onDriveableRoad, type RoadSegment } from '../world/osm';

export type VehicleKind='car'|'bike';
export class Vehicle {
  public readonly sprite:Phaser.GameObjects.Image;
  public speed=0;
  constructor(scene:Phaser.Scene,public kind:VehicleKind,x:number,y:number){
    this.sprite=scene.add.image(x,y,kind==='car'?'red-car':'green-bike')
      .setScale(kind==='car'?.36:.42).setDepth(25);
  }
  get x():number{return this.sprite.x;}
  get y():number{return this.sprite.y;}
  get rotation():number{return this.sprite.rotation;}
  steer(inputX:number,inputY:number,deltaSeconds:number,obstacles:Rectangle[],width:number,height:number,roads:RoadSegment[]=[]):void{
    const accel=this.kind==='car'?290:170;
    const max=this.kind==='car'?260:138;
    const handbrake=inputY>.3 && this.speed>0;
    if(inputY<-.15)this.speed+=accel*deltaSeconds;
    else if(inputY>.15)this.speed-=accel*(handbrake?1.5:.55)*deltaSeconds;
    else this.speed*=Math.max(0,1-(this.kind==='car'?1.25:2)*deltaSeconds);
    this.speed=Phaser.Math.Clamp(this.speed,-max*.32,max);
    const factor=Phaser.Math.Clamp(Math.abs(this.speed)/(this.kind==='car'?80:38),0.18,1);
    if(Math.abs(this.speed)>3)this.sprite.rotation+=inputX*deltaSeconds*(this.kind==='car'?2.25:2.8)*factor*Math.sign(this.speed);
    const distance=this.speed*deltaSeconds;
    const x=this.x+Math.sin(this.rotation)*distance,y=this.y-Math.cos(this.rotation)*distance;
    const radius=this.kind==='car'?11:7;
    const blocked=x<radius||y<radius||x>width-radius||y>height-radius||
      obstacles.some(b=>x+radius>b.x+4&&x-radius<b.x+b.w-4&&y+radius>b.y+4&&y-radius<b.y+b.h-4);
    if(blocked){this.speed*=-.18;return;}
    // No invisible rails: leaving paved roads slows the car sharply instead of teleporting it.
    if(roads.length && !onDriveableRoad(x,y,roads,this.kind==='car'?9:14)){
      this.speed*=Math.max(0,1-8*deltaSeconds);
      if(this.kind==='car' && Math.abs(this.speed)>55)return;
    }
    this.sprite.setPosition(x,y);
  }
}
