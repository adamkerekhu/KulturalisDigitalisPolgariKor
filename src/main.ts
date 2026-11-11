import Phaser from 'phaser';
import { StreetScene } from './scenes/StreetScene';
import './style.css';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#263d35',
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { pixelArt: true, antialias: false },
  physics: { default: 'arcade', arcade: { debug: false, gravity: { x: 0, y: 0 } } },
  scene: [StreetScene]
});
window.addEventListener('beforeunload', () => game.destroy(true));
