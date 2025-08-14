import elwynnForestJSON from '../assets/elwynn.json';
import { Enemy } from '../entities/enemy';
import { Player } from '../entities/player';
import { LAYERS, SIZES, SPRITES, TILES } from '../utils/constants';
import socket from '../utils/socket';
import VirtualJoystickPlugin from 'phaser3-rex-plugins/plugins/virtualjoystick-plugin.js';

export class ElwynnForest extends Phaser.Scene {
    private uiCamera: Phaser.Cameras.Scene2D.Camera;
    private joystick?: any;
    private player?: Player;
    private boar: Enemy;
    private worldZoom: number = this.calculateAutoZoom();
    wasd: any;
    boarSecond: Enemy;
    killsCounter: number = 0;
    otherPlayers = [];
    worldContainer: any;
    debugGraphics: Phaser.GameObjects.Graphics;
    constructor() {
        super('ElwynnForestScene');
    }

    preload () {
        this.load.image(TILES.ELWYNN, 'src/assets/summer_tiles.png')
        this.load.tilemapTiledJSON('map', 'src/assets/elwynn.json')
        this.load.spritesheet(SPRITES.PLAYER.base, 'src/assets/characters/alliance.png', {
            frameWidth: SIZES.PLAYER.WIDTH,
            frameHeight: SIZES.PLAYER.HEIGHT
        })
        this.load.spritesheet(SPRITES.PLAYER.fight, 'src/assets/characters/alliance-fight-small.png', {
            frameWidth: SIZES.PLAYER.WIDTH,
            frameHeight: SIZES.PLAYER.HEIGHT
        })

        this.load.spritesheet(SPRITES.BOAR.base, 'src/assets/characters/boar.png', {
            frameWidth: SIZES.BOAR.WIDTH,
            frameHeight: SIZES.BOAR.HEIGHT
        })
    }

    private addOtherPlayer(player) {
        const otherPlayer = new Player(this, player.x, player.y, SPRITES.PLAYER, '', '')
        this.otherPlayers[player.id] = otherPlayer
    }

    create () {
        this.cameras.main.setZoom(this.worldZoom);
        
        const map = this.make.tilemap({ key: "map" });
        
        const tileset = map.addTilesetImage(elwynnForestJSON.tilesets[0].name, TILES.ELWYNN, SIZES.TILE, SIZES.TILE);
        const groundLayer = map.createLayer(LAYERS.GROUND, tileset, 0, 0);
        const wallsLayer = map.createLayer(LAYERS.WALLS, tileset, 0, 0);
        
        this.player = new Player(this, 400, 250, SPRITES.PLAYER, '', '');
        this.boar = new Enemy(this, 600, 400, SPRITES.BOAR.base);
        this.boarSecond = new Enemy(this, 200, 300, SPRITES.BOAR.base);
        this.boar.setPlayer(this.player);
        this.boarSecond.setPlayer(this.player);
        this.player.setEnemies([this.boar, this.boarSecond]);

        // Создаем дополнительную камеру для UI
        this.uiCamera = this.cameras.add();
        this.uiCamera.setScroll(0, 0);
        this.uiCamera.setViewport(0, 0, window.innerWidth, window.innerHeight);
        this.uiCamera.ignore([groundLayer, wallsLayer, this.player, this.boar, this.boarSecond]); // Игнорируем игровые объекты
        
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.player.setCollideWorldBounds(true);

        this.physics.add.collider(this.player, wallsLayer);
        wallsLayer.setCollisionByExclusion([-1]);

        this.uiCamera.startFollow(this.cameras.main, true);

        this.createUI();

        socket.emit('playerJoin', {
            x: this.player.x,
            y: this.player.y,
            name: 'hero'
        })

        socket.on('playerJoined', (data) => {
            if (data.id !== socket.id) {
                this.addOtherPlayer(data);
            }
        })

        socket.on('currentPlayers', (players) => {
            players.forEach((player) => {
                if (player.id !== socket.id) {
                    this.addOtherPlayer(player);
                }
            })
        })

        socket.on('playerLeft', (id) => {
            if (this.otherPlayers[id]) {
                this.otherPlayers[id].destroy();
                delete this.otherPlayers[id];
            }
        })

        socket.on('playerMoved', (data) => {
            if (this.otherPlayers[data.id]) {
                this.otherPlayers[data.id].x = data.x;
                this.otherPlayers[data.id].y = data.y;
            }
        })
        
    }

    update(_: number, delta: number): void {
        this.cameras.main.roundPixels = true;
        this.player.update(delta);
        this.boar.update();
        this.boarSecond.update();
    }

    private createUI() {
        const mainCameraIgnoreList = [];
        const joystickPlugin = this.plugins.get('rexVirtualJoystick') as VirtualJoystickPlugin;

        // Джойстик для передвижения
        this.joystick = joystickPlugin.add(this, {
            x: 90,
            y: window.innerHeight - 120,
            radius: 55,
            base: this.add.circle(0, 0, 55, 0x888888),
            thumb: this.add.circle(0, 0, 28, 0xcccccc),
            dir: '8dir',
            fixed: true,
        });
        mainCameraIgnoreList.push(this.joystick.base, this.joystick.thumb);

        // Джойстики для заклинаний и направления
        const viewAngleJoystick = joystickPlugin.add(this, {
            x: window.innerWidth - 65,
            y: window.innerHeight - 100,
            radius: 35,
            base: this.add.circle(0, 0, 35, 0x888888),
            thumb: this.add.circle(0, 0, 23, 0xcccccc),
            dir: '8dir',
            fixed: true,
        });
        mainCameraIgnoreList.push(viewAngleJoystick.base, viewAngleJoystick.thumb);

        const spellJoystick1 = joystickPlugin.add(this, {
            x: window.innerWidth - 150,
            y: window.innerHeight - 88,
            radius: 25,
            base: this.add.circle(0, 0, 25, 0x888888),
            thumb: this.add.circle(0, 0, 23, 0xcccccc),
            dir: '8dir',
            fixed: true,
        });
        mainCameraIgnoreList.push(spellJoystick1.base, spellJoystick1.thumb);
        const spellJoystick2 = joystickPlugin.add(this, {
            x: window.innerWidth - 128,
            y: window.innerHeight - 157,
            radius: 25,
            base: this.add.circle(0, 0, 25, 0x888888),
            thumb: this.add.circle(0, 0, 23, 0xcccccc),
            dir: '8dir',
            fixed: true,
        });
        mainCameraIgnoreList.push(spellJoystick2.base, spellJoystick2.thumb);
        const spellJoystick3 = joystickPlugin.add(this, {
            x: window.innerWidth - 55,
            y: window.innerHeight - 184,
            radius: 25,
            base: this.add.circle(0, 0, 25, 0x888888),
            thumb: this.add.circle(0, 0, 23, 0xcccccc),
            dir: '8dir',
            fixed: true,
        });
        mainCameraIgnoreList.push(spellJoystick3.base, spellJoystick3.thumb);
        const spellJoystick4 = joystickPlugin.add(this, {
            x: window.innerWidth - 55,
            y: window.innerHeight - 258,
            radius: 25,
            base: this.add.circle(0, 0, 25, 0x888888),
            thumb: this.add.circle(0, 0, 23, 0xcccccc),
            dir: '8dir',
            fixed: true,
        });
        mainCameraIgnoreList.push(spellJoystick4.base, spellJoystick4.thumb);
        
        // Указываем, что UI элементы должны отображаться только в UI камере
        this.cameras.main.ignore(mainCameraIgnoreList);
        
        // WASD управление
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
    }

    private calculateAutoZoom(): number {
        const MOBILE_BREAKPOINT = 850; // Ширина экрана, ниже которой считаем устройство мобильным
        const DESKTOP_BREAKPOINT = 1200; // Ширина экрана, выше которой применяем максимальный зум
        const MIN_ZOOM = 1.0; // Минимальный зум (для мобильных)
        const MAX_ZOOM = 1.5; // Максимальный зум (для десктопов)
        
        const screenWidth = window.innerWidth;
        
        // Если экран меньше мобильного breakpoint - возвращаем минимальный зум
        if (screenWidth <= MOBILE_BREAKPOINT) {
            return MIN_ZOOM;
        }
        
        // Если экран больше десктопного breakpoint - возвращаем максимальный зум
        if (screenWidth >= DESKTOP_BREAKPOINT) {
            return MAX_ZOOM;
        }
        
        // Для промежуточных значений вычисляем пропорциональный зум
        const range = DESKTOP_BREAKPOINT - MOBILE_BREAKPOINT;
        const positionInRange = (screenWidth - MOBILE_BREAKPOINT) / range;
        return MIN_ZOOM + (positionInRange * (MAX_ZOOM - MIN_ZOOM));
    }
}