import { Enemy } from '../entities/enemy';
import { Player } from '../entities/player';
import { LAYERS, SIZES, SPRITES, TILES } from '../utils/constants';
import { JoysticksController } from '../utils/joysticks';
import socket from '../utils/socket';

export class ElwynnForest extends Phaser.Scene {
    private uiCamera: Phaser.Cameras.Scene2D.Camera;
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
        this.load.image(TILES.ELWYNN, '/assets/summer_tiles.png')
        this.load.tilemapTiledJSON('map', '/assets/elwynn.json')
        this.load.spritesheet(SPRITES.PLAYER.base, '/assets/characters/alliance.png', {
            frameWidth: SIZES.PLAYER.WIDTH,
            frameHeight: SIZES.PLAYER.HEIGHT
        })
        this.load.spritesheet(SPRITES.PLAYER.fight, '/assets/characters/alliance-fight-small.png', {
            frameWidth: SIZES.PLAYER.WIDTH,
            frameHeight: SIZES.PLAYER.HEIGHT
        })

        this.load.spritesheet(SPRITES.BOAR.base, '/assets/characters/boar.png', {
            frameWidth: SIZES.BOAR.WIDTH,
            frameHeight: SIZES.BOAR.HEIGHT
        })
    }

    private addOtherPlayer(player) {
        const otherPlayer = new Player(this, player.x, player.y, SPRITES.PLAYER, null, null);
        this.otherPlayers[player.id] = otherPlayer
    }

    create () {
        this.input.addPointer(1);
        this.cameras.main.setZoom(this.worldZoom);
        this.cameras.main.setRoundPixels(true);
        
        const map = this.make.tilemap({ key: "map" });
        
        const tileset = map.addTilesetImage('Summer_Tiles', TILES.ELWYNN, SIZES.TILE, SIZES.TILE, 0, 1);
        const groundLayer = map.createLayer(LAYERS.GROUND, tileset, 0, 0);
        const wallsLayer = map.createLayer(LAYERS.WALLS, tileset, 0, 0);

        // Creating joysticks controls
        const joysticksController = new JoysticksController(this, this.player);
        joysticksController.createJoysticks();

        // WASD управление
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
        
        this.player = new Player(this, 400, 250, SPRITES.PLAYER, joysticksController, this.wasd);
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
        this.uiCamera.setRoundPixels(true);
        
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.player.setCollideWorldBounds(true);

        this.physics.add.collider(this.player, wallsLayer);
        wallsLayer.setCollisionByExclusion([-1]);

        this.uiCamera.startFollow(this.cameras.main, true);

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

    private calculateAutoZoom(): number {
        const MOBILE_BREAKPOINT = 900; // Ширина экрана, ниже которой считаем устройство мобильным
        const DESKTOP_BREAKPOINT = 1200; // Ширина экрана, выше которой применяем максимальный зум
        const MIN_ZOOM = 1; // Минимальный зум (для мобильных)
        const MAX_ZOOM = 2; // Максимальный зум (для десктопов)
        
        const screenWidth = window.innerWidth;
        
        // Если экран меньше мобильного breakpoint - возвращаем минимальный зум
        if (screenWidth <= MOBILE_BREAKPOINT) {
            return MIN_ZOOM;
        }
        
        // Если экран больше десктопного breakpoint - возвращаем максимальный зум
        if (screenWidth >= DESKTOP_BREAKPOINT) {
            return MAX_ZOOM;
        }
    }
}