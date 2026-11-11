import Phaser from 'phaser';
export class Player {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private facing = 'down';
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'player-down');
    this.sprite.setDepth(28).setCollideWorldBounds(true).setCircle(11, 5, 16);
  }
  move(x: number, y: number, sprint: boolean): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const mag = Math.hypot(x, y);
    if (mag < .1) { body.setVelocity(0, 0); return; }
    const speed = sprint ? 260 : 185;
    body.setVelocity(x / Math.max(1, mag) * speed, y / Math.max(1, mag) * speed);
    this.facing = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
    this.sprite.setTexture('player-'+this.facing);
  }
}
