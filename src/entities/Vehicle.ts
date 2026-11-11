import Phaser from 'phaser';
import type { Rectangle } from '../world/map';

export type VehicleKind = 'car' | 'bike';
export class Vehicle {
  public readonly sprite: Phaser.GameObjects.Image;
  public speed = 0;
  constructor(private scene: Phaser.Scene, public kind: VehicleKind, x: number, y: number) {
    const texture = kind === 'car' ? 'red-car' : 'green-bike';
    this.sprite = scene.add.image(x, y, texture).setDepth(25);
  }
  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
  get rotation(): number { return this.sprite.rotation; }
  steer(inputX: number, inputY: number, deltaSeconds: number, obstacles: Rectangle[], width: number, height: number): void {
    const acceleration = this.kind === 'car' ? 420 : 245;
    const max = this.kind === 'car' ? 390 : 205;
    if (inputY < -0.15) this.speed += acceleration * deltaSeconds;
    else if (inputY > 0.15) this.speed -= acceleration * 0.75 * deltaSeconds;
    else this.speed *= Math.max(0, 1 - 2.5 * deltaSeconds);
    this.speed = Phaser.Math.Clamp(this.speed, -max * 0.4, max);
    if (Math.abs(this.speed) > 5) this.sprite.rotation += inputX * deltaSeconds * (this.kind === 'car' ? 1.9 : 2.7) * Math.sign(this.speed);
    const x = this.x + Math.sin(this.rotation) * this.speed * deltaSeconds;
    const y = this.y - Math.cos(this.rotation) * this.speed * deltaSeconds;
    const radius = this.kind === 'car' ? 29 : 14;
    if (x < radius || y < radius || x > width - radius || y > height - radius || obstacles.some(b => x+radius>b.x+5 && x-radius<b.x+b.w-5 && y+radius>b.y+5 && y-radius<b.y+b.h-5)) {
      this.speed = 0;
    } else {
      this.sprite.setPosition(x, y);
    }
  }
}
