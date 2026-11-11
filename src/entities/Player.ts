import Phaser from 'phaser';
import { circleHitsBuildings, WORLD_WIDTH, WORLD_HEIGHT, type CityGeometry, type Vec2 } from '../world/geo';

export class Player {
 readonly sprite: Phaser.GameObjects.Image;
 private direction='down';
 private stepTime=0;
 constructor(scene:Phaser.Scene,x:number,y:number){
  this.sprite=scene.add.image(x,y,'player-down').setScale(.24).setDepth(30);
 }
 get position():Vec2 {return {x:this.sprite.x,y:this.sprite.y};}
 setPosition(x:number,y:number):void {this.sprite.setPosition(x,y);}
 setVisible(visible:boolean):void {this.sprite.setVisible(visible);}
 move(x:number,y:number,sprint:boolean,dt:number,city:CityGeometry):void {
  const magnitude=Math.hypot(x,y);
  if(magnitude<.12){this.sprite.setAngle(0);return;}
  const nx=x/Math.max(1,magnitude),ny=y/Math.max(1,magnitude);
  const speed=sprint?35:23; // pixels/s at 5 px per metre
  const radius=4;
  const px=this.sprite.x+nx*speed*dt,py=this.sprite.y+ny*speed*dt;
  const available=(x:number,y:number)=>x>radius&&y>radius&&x<WORLD_WIDTH-radius&&y<WORLD_HEIGHT-radius&&!circleHitsBuildings({x,y},radius,city.buildings);
  if(available(px,this.sprite.y))this.sprite.x=px;
  if(available(this.sprite.x,py))this.sprite.y=py;
  const next=Math.abs(nx)>Math.abs(ny)?nx>0?'right':'left':ny>0?'down':'up';
  if(next!==this.direction){this.direction=next;this.sprite.setTexture('player-'+next);}
  this.stepTime+=dt*speed*.5;
  this.sprite.setAngle(Math.sin(this.stepTime)*3);
 }
}
