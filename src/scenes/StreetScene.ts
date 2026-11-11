import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { drawOSMMap, mapToWorld, getRoadSegments, nearestRoad, type RoadSegment, type OSMMap } from '../world/osm';
import { Vehicle } from '../entities/Vehicle';
import { WORLD, roads, blocks, locations, colliders, type Rectangle, type Location } from '../world/map';

type DirectionKeys = { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; UP: Phaser.Input.Keyboard.Key; DOWN: Phaser.Input.Keyboard.Key; LEFT: Phaser.Input.Keyboard.Key; RIGHT: Phaser.Input.Keyboard.Key; SHIFT: Phaser.Input.Keyboard.Key; E: Phaser.Input.Keyboard.Key; PLUS: Phaser.Input.Keyboard.Key; MINUS: Phaser.Input.Keyboard.Key };
const hud = (id: string, text: string) => { const el=document.getElementById(id); if(el) el.textContent=text; };

export class StreetScene extends Phaser.Scene {
  private player!: Player;
  private car!: Vehicle;
  private bicycle!: Vehicle;
  private active: Vehicle | null = null;
  private keys!: DirectionKeys;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private activeColliders: Rectangle[] = colliders;
  private osmPoints: Array<{name:string;x:number;y:number}> = [];
  private driveRoads:RoadSegment[]=[];
  private baseZoom=2.15;
  private stick = {x:0,y:0};
  private touchInteract = false;
  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor() { super('StreetScene'); }

  create(): void {
    this.createTextures();
    this.renderNeighborhood();
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    this.obstacles = this.physics.add.staticGroup();
    for(const b of colliders) {
      const wall = this.obstacles.create(b.x+b.w/2, b.y+b.h/2, 'invisible') as Phaser.Physics.Arcade.Image;
      wall.setDisplaySize(b.w-10, b.h-10).setVisible(false).refreshBody();
    }
    this.player = new Player(this, 690, 1500);
    this.physics.add.collider(this.player.sprite, this.obstacles);
    this.car = new Vehicle(this, 'car', 480, 1492);
    this.bicycle = new Vehicle(this, 'bike', 685, 1790);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.player.sprite.setScale(.62);
    this.cameras.main.startFollow(this.player.sprite, true, 0.095, 0.095);
    this.baseZoom=innerWidth<760?1.4:2.15;
    this.cameras.main.setZoom(this.baseZoom);
    this.keys = this.input.keyboard!.addKeys({W:'W',A:'A',S:'S',D:'D',UP:'UP',DOWN:'DOWN',LEFT:'LEFT',RIGHT:'RIGHT',SHIFT:'SHIFT',E:'E',PLUS:'PLUS',MINUS:'MINUS'}) as DirectionKeys;
    this.input.keyboard?.on('keydown-E', (event: KeyboardEvent) => {if(!event.repeat)this.interact();});
    this.input.keyboard?.on('keydown-PLUS', ()=>this.changeZoom(.1));
    this.input.keyboard?.on('keydown-MINUS', ()=>this.changeZoom(-.1));
    this.setupTouch();
    void this.loadStreetMap();
    this.toast('Welcome to Mester utca. Find the red car or a green Bubi bike!');
  }

  private setupTouch(): void {
    const pad=document.getElementById('pad');
    const knob=document.getElementById('knob');
    let activePointer: number|null=null;
    if(pad && knob) {
      const update=(ev:PointerEvent)=>{
        const rect=pad.getBoundingClientRect();
        const dx=ev.clientX-rect.left-rect.width/2;
        const dy=ev.clientY-rect.top-rect.height/2;
        const len=Math.max(1,Math.hypot(dx,dy));
        const distance=Math.min(len,35);
        this.stick.x=dx/Math.max(35,len);this.stick.y=dy/Math.max(35,len);
        knob.style.transform='translate('+dx/len*distance+'px,'+dy/len*distance+'px)';
      };
      pad.addEventListener('pointerdown',ev=>{activePointer=ev.pointerId;pad.setPointerCapture(activePointer);update(ev);});
      pad.addEventListener('pointermove',ev=>{if(activePointer===ev.pointerId)update(ev);});
      const end=()=>{activePointer=null;this.stick.x=this.stick.y=0;knob.style.transform='';};
      pad.addEventListener('pointerup',end);pad.addEventListener('pointercancel',end);
    }
    document.getElementById('interact')?.addEventListener('pointerdown',ev=>{ev.preventDefault();this.touchInteract=true;});
  }

  private changeZoom(diff:number):void {this.baseZoom=Phaser.Math.Clamp(this.baseZoom+diff,0.8,3.4);}
  private toast(message:string):void {
    const el=document.getElementById('toast');if(!el)return;
    el.textContent=message;el.style.opacity='1';
    if(this.toastTimer)clearTimeout(this.toastTimer);
    this.toastTimer=setTimeout(()=>el.style.opacity='0',3400);
  }
  private nearbyLocation(): Location|undefined {
    const x=this.player.sprite.x,y=this.player.sprite.y;
    if(this.osmPoints.length) {
      const nearest=this.osmPoints.find(p=>Math.hypot(x-p.x,y-p.y)<105);
      if(nearest)return {name:nearest.name,sub:'',x:nearest.x-5,y:nearest.y-5,w:10,h:10,color:0xffffff,icon:''};
      return undefined;
    }
    return locations.find(p=>Math.hypot(x-(p.x+p.w/2),y-(p.y+p.h/2))<210);
  }
  private interact():void {
    if(this.active){
      const v=this.active;
      this.active=null;
      const candidates=[[v.x+65,v.y],[v.x-65,v.y],[v.x,v.y+65],[v.x,v.y-65]];
      const valid=candidates.find(([x,y])=>!this.isBlocked(x,y,15));
      const [x,y]=valid ?? [v.x,v.y];
      this.player.sprite.enableBody(true,x,y,true,true);
      v.speed=0;
      hud('status','🚶 ON FOOT');
      this.toast('Out of the vehicle. Back to the pavement.');
      return;
    }
    for(const v of [this.car,this.bicycle]){
      if(Math.hypot(this.player.sprite.x-v.x,this.player.sprite.y-v.y)<110){
        this.active=v;
        this.player.sprite.disableBody(true,true);
        this.player.sprite.setPosition(v.x,v.y);
        hud('status',v.kind==='car'?'🚗 DRIVING':'🚲 BUBI');
        this.toast(v.kind==='car'?'Red car: W forward, S reverse, A/D steer, E to exit.':'Bubi unlocked! W forward, A/D steer, E to get off.');
        return;
      }
    }
    const place=this.nearbyLocation();
    this.toast(place ? place.name+' · Interior and shop interactions are planned for a later version.' : 'Nothing to interact with here.');
  }
  private isBlocked(x:number,y:number,r:number):boolean {
    return x<r||y<r||x>WORLD.width-r||y>WORLD.height-r||
      this.activeColliders.some(b=>x+r>b.x+5&&x-r<b.x+b.w-5&&y+r>b.y+5&&y-r<b.y+b.h-5);
  }

  update(_time:number,delta:number):void {
    if(!this.player)return;
    const x=Number(this.keys.D.isDown||this.keys.RIGHT.isDown)-Number(this.keys.A.isDown||this.keys.LEFT.isDown)+this.stick.x;
    const y=Number(this.keys.S.isDown||this.keys.DOWN.isDown)-Number(this.keys.W.isDown||this.keys.UP.isDown)+this.stick.y;
    const dt=Math.min(delta/1000,.045);
    if(this.touchInteract){this.touchInteract=false;this.interact();}
    if(this.active){
      this.active.steer(x,y,dt,this.activeColliders,WORLD.width,WORLD.height,this.driveRoads);
      this.player.sprite.setPosition(this.active.x,this.active.y);
    } else {
      this.player.move(x,y,this.keys.SHIFT.isDown);
    }
    const targetZoom=this.active?.kind==='car'?this.baseZoom*.76:this.active?.kind==='bike'?this.baseZoom*.90:this.baseZoom;
    this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom,targetZoom,Math.min(1,dt*2.7)));
    const look=this.active ? Phaser.Math.Clamp(this.active.speed*.18,-38,38):0;
    this.cameras.main.setFollowOffset(this.active?-Math.sin(this.active.rotation)*look:0,this.active?Math.cos(this.active.rotation)*look:0);
    const near=this.nearbyLocation();
    hud('nearby',this.active?'W: forward · S: reverse · A/D: steer · E: exit':near?near.name+' · Press E to interact':'Walk around · E to enter a car or Bubi');
  }


  private async loadStreetMap():Promise<void> {
    try {
      const response = await fetch('/osm-map.json',{cache:'no-store'});
      if(!response.ok)throw new Error('Map fetch HTTP '+response.status);
      const map = await response.json() as OSMMap;
      if(!Array.isArray(map.elements)||map.elements.length<50)throw new Error(map.error||'Map has no streets');
      // Remove only the original schematic scenery; the player and vehicles remain.
      for(const child of [...this.children.list]) if((child as Phaser.GameObjects.GameObject & {depth:number}).depth<0)child.destroy();
      const footprints=drawOSMMap(this,map);
      this.obstacles.clear(true,true);
      this.activeColliders=footprints;
      this.driveRoads=getRoadSegments(map);
      this.osmPoints = map.elements.filter(e=>e.type==='node' && e.lat!=null && e.lon!=null && e.tags?.name && /maestro|gyros|spar|dohánybolt|bubi/i.test(e.tags.name)).map(e=>({name:e.tags!.name!,...mapToWorld(e.lat!,e.lon!)}));
      this.osmPoints.push({name:'MAESTRO PUB',...mapToWorld(47.47857,19.07400)},{name:'SPAR MARKET',...mapToWorld(47.4784266,19.0742364)});
      for(const b of footprints) {
        const wall=this.obstacles.create(b.x+b.w/2,b.y+b.h/2,'invisible') as Phaser.Physics.Arcade.Image;
        wall.setDisplaySize(Math.max(4,b.w-12),Math.max(4,b.h-12)).setVisible(false).refreshBody();
      }
      const pub=mapToWorld(47.47857,19.07400);
      const nearest=nearestRoad(pub.x,pub.y,this.driveRoads);
      const candidates=nearest?[[nearest.x,nearest.y],[nearest.x+15,nearest.y],[nearest.x-15,nearest.y],[nearest.x,nearest.y+15],[nearest.x,nearest.y-15]]:[[pub.x-45,pub.y],[pub.x+45,pub.y],[pub.x,pub.y+45],[pub.x,pub.y-45],[pub.x-85,pub.y]];
      const spawn=candidates.find(([x,y])=>x>20&&y>20&&x<WORLD.width-20&&y<WORLD.height-20&&!footprints.some(b=>x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h)) ?? [pub.x,pub.y];
      this.player.sprite.setPosition(spawn[0],spawn[1]);
      // Parked car and Bubi bike start near Maestro until confirmed station geometry is imported.
      const park=nearestRoad(pub.x+35,pub.y+48,this.driveRoads);
      const cycle=nearestRoad(pub.x-25,pub.y-65,this.driveRoads);
      if(park){this.car.sprite.setPosition(park.x,park.y);this.car.sprite.setRotation(park.angle);}
      else this.car.sprite.setPosition(pub.x-80,pub.y+75);
      if(cycle){this.bicycle.sprite.setPosition(cycle.x,cycle.y);this.bicycle.sprite.setRotation(cycle.angle);}
      else this.bicycle.sprite.setPosition(pub.x+30,pub.y+110);
      this.cameras.main.setBounds(0,0,WORLD.width,WORLD.height);
      this.toast('Real OpenStreetMap streets loaded! © OpenStreetMap contributors.');
    }catch(error){
      console.warn('Using fallback schematic map:',error);
      this.toast('OSM data unavailable; using the schematic map until the next build.');
    }
  }

  private createTextures():void {
    const g=this.make.graphics({x:0,y:0});
    g.fillStyle(0xffffff).fillRect(0,0,8,8).generateTexture('invisible',8,8);g.clear();
    const color=0x397d91;
    const drawPlayer=(dir:string)=>{
      g.clear();
      g.fillStyle(0x24343b);g.fillRect(7,32,8,13);g.fillRect(20,32,8,13);
      g.fillStyle(color);g.fillRoundedRect(3,15,29,22,7);
      g.fillStyle(0xe8b58b);g.fillCircle(17,13,12);
      g.fillStyle(0x3b302c);g.fillEllipse(17,5,24,8);
      g.fillStyle(0x172b31);
      if(dir==='up'){g.fillRect(12,9,10,3);}
      else if(dir==='left'){g.fillRect(8,13,3,3);}
      else if(dir==='right'){g.fillRect(23,13,3,3);}
      else{g.fillRect(12,13,3,3);g.fillRect(20,13,3,3);}
      g.generateTexture('player-'+dir,35,48);
    };
    ['up','down','left','right'].forEach(drawPlayer);
    g.clear();
    g.fillStyle(0x1e2429);for(const xx of [2,48])for(const yy of [12,73])g.fillRoundedRect(xx,yy,9,20,3);
    g.fillStyle(0xb4473f).fillRoundedRect(6,2,48,96,12);
    g.fillStyle(0x243a41).fillRoundedRect(11,27,38,41,6);
    g.fillStyle(0xffe5a0).fillRect(12,7,10,7).fillRect(38,7,10,7);
    g.generateTexture('red-car',60,102);
    g.clear();g.lineStyle(4,0x182a29);g.strokeCircle(22,17,12).strokeCircle(22,69,12);
    g.lineStyle(5,0x62d18c);g.lineBetween(22,17,8,43).lineBetween(8,43,22,69).lineBetween(22,69,35,43).lineBetween(35,43,22,17);
    g.generateTexture('green-bike',44,86);
    g.destroy();
  }

  private renderNeighborhood():void {
    const g=this.add.graphics().setDepth(-50);
    g.fillStyle(0x52715d).fillRect(0,0,WORLD.width,WORLD.height);
    for(let i=0;i<130;i++){
      const x=(i*193+67)%WORLD.width,y=(i*337+89)%WORLD.height;
      if(roads.some(r=>this.inRect(x,y,r,35))||colliders.some(r=>this.inRect(x,y,r,4)))continue;
      g.fillStyle(0x376749).fillCircle(x,y,14);g.fillStyle(0x79a278).fillCircle(x-4,y-4,6);
    }
    for(const r of roads){
      g.fillStyle(0xa7ab9b).fillRect(r.x-25,r.y-25,r.w+50,r.h+50);
      g.fillStyle(0x384447).fillRect(r.x,r.y,r.w,r.h);
    }
    g.lineStyle(3,0xe5c58a);
    for(let y=0;y<WORLD.height;y+=38)g.lineBetween(613,y,613,y+15);
    g.lineStyle(3,0xa5b9bb).lineBetween(537,0,537,WORLD.height).lineBetween(554,0,554,WORLD.height);
    for(let y=14;y<WORLD.height;y+=25)g.lineStyle(2,0xc3b68c).lineBetween(535,y,556,y);
    for(const y of [194,625,1100,1870,2339])for(let x=487;x<740;x+=34)g.fillStyle(0xd8ded4).fillRect(x,y+31,17,51);
    for(const b of blocks)this.building(g,b,0xa39c88);
    for(const p of locations) {
      this.building(g,p,p.color);
      this.text(p.name,p.x+p.w/2,p.y+p.h/2-12,p.name.length>12?16:21);
      this.text(p.sub,p.x+p.w/2,p.y+p.h/2+16,12);
      g.fillStyle(0xf4dea6).fillRect(p.x-8,p.y+p.h*.5,14,34);
    }
    this.text('MESTER UTCA',623,805,25,-Math.PI/2);
    this.text('MESTER UTCA',623,2040,25,-Math.PI/2);
    this.text('ANGYAL UTCA',600,256,15);
    this.text('LILIOM UTCA',600,688,15);
    this.text('BOKRÉTA UTCA',600,1163,15);
    this.text('BORÁROS TÉR ↑',615,66,18);
    this.text('↓ HALLER UTCA',615,2552,18);
    g.fillStyle(0xabc48d).fillRect(506,1577,50,97);
    this.text('TRAM',529,1563,12);
  }
  private inRect(x:number,y:number,b:Rectangle,pad=0):boolean {
    return x>b.x-pad&&x<b.x+b.w+pad&&y>b.y-pad&&y<b.y+b.h+pad;
  }
  private building(g:Phaser.GameObjects.Graphics,b:Rectangle,color:number):void {
    g.fillStyle(0x1f3030,.5).fillRoundedRect(b.x+9,b.y+11,b.w,b.h,5);
    g.fillStyle(color).fillRoundedRect(b.x,b.y,b.w,b.h,5);
    g.lineStyle(4,0x44514b).strokeRoundedRect(b.x,b.y,b.w,b.h,5);
    g.lineStyle(2,0xd6d2bd).strokeRect(b.x+14,b.y+14,b.w-28,b.h-28);
    for(let x=b.x+19;x<b.x+b.w-20;x+=30)g.fillStyle(0x3b5150).fillRect(x,b.y+4,14,8);
  }
  private text(message:string,x:number,y:number,size=17,angle=0):void {
    this.add.text(x,y,message,{fontFamily:'Arial, sans-serif',fontSize:size+'px',color:'#f9ebce',fontStyle:'bold',stroke:'#17312d',strokeThickness:4,align:'center'}).setOrigin(.5).setRotation(angle).setDepth(-30);
  }
}
