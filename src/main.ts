import Phaser from 'phaser';
import './style.css'
import { scenes } from './scenes';
import {SpinePlugin} from "@esotericsoftware/spine-phaser-v3";
import VirtualJoystickPlugin from 'phaser3-rex-plugins/plugins/virtualjoystick-plugin.js';

new Phaser.Game({
  width: window.innerWidth,
  height: window.innerHeight,
  title: 'Phaser RPG',
  scene: scenes,
  url: import.meta.env.URL || '',
  version: import.meta.env.VERSION || '0.0.1',
  backgroundColor: '#000',
  plugins: {
    scene: [
      { key: "spine.SpinePlugin", plugin: SpinePlugin, mapping: "spine" }
    ],
    global: [
      { key: 'rexVirtualJoystick', plugin: VirtualJoystickPlugin, start: true }
    ],
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: true
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE, // Изменено на RESIZE
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true
  },
});
