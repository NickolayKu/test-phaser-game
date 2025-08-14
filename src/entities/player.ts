import { SPRITES } from '../utils/constants'
import socket from '../utils/socket'
import { Entity } from './entity'

type SpriteType = {
    [key: string]: string
    base: string
    fight?: string
}

export class Player extends Entity {
    textureKey: string
    private moveSpeed: number
    enemies: Entity[]
    target: Entity
    private isAttacking: boolean
    playerHealthBar: any
    enemyHealthBar: Phaser.GameObjects.Graphics
    spineKey: string
    atlasKey: string

    constructor(scene: Phaser.Scene, x: number, y: number, texture: SpriteType, spineKey: string, atlasKey: string) {
        super(scene, x, y, texture.base, SPRITES.PLAYER.base)

        const anims = this.scene.anims;
        const animsFrameRate = 9;
        this.moveSpeed = 20;
        this.setSize(28, 32);
        this.setOffset(10, 16);
        this.setScale(0.9);

        this.setupKeysListeners()
        this.createAnimation('down', texture.base, 0, 2, anims, animsFrameRate)
        this.createAnimation('left', texture.base, 12, 14, anims, animsFrameRate)
        this.createAnimation('right', texture.base, 24, 26, anims, animsFrameRate)
        this.createAnimation('up', texture.base, 36, 38, anims, animsFrameRate)
        this.createAnimation('fight', texture.fight, 3, 6, anims, animsFrameRate, 0)
        this.drawPlayerHealthBar()
        this.on('animationcomplete', () => {
            this.isAttacking = false
        })
    }

    private drawPlayerHealthBar() {
        if (!this.playerHealthBar) {
            this.playerHealthBar = this.scene.add.graphics()
            this.playerHealthBar.setScrollFactor(0)
        }
        this.playerHealthBar.clear()
        this.drawHealthBar(this.playerHealthBar, 10, 10, this.health / 100)
    }

    private drawEnemyHealthBar(target) {
        if (!this.enemyHealthBar) {
            this.enemyHealthBar = this.scene.add.graphics()
            this.enemyHealthBar.setScrollFactor(0)
        }
        this.enemyHealthBar.clear()
        this.drawHealthBar(this.playerHealthBar, 10, 30, target.health / 100)
    }

    private drawHealthBar(graphics, x, y, percentage) {
        graphics.fillStyle(0x000000, 1)
        graphics.fillRect(x, y, 100, 10)

        graphics.fillStyle(0x00ff00, 1)
        graphics.fillRect(x, y, 100 * percentage, 10)
    }

    setEnemies(enemies: Entity[]) {
        this.enemies = enemies
    }

    private findTarget(enemies: Entity[]) {
        let target = null
        let minDistance = Infinity

        for (const enemy of enemies) {
            const distanceToEnemy = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y)

            if (distanceToEnemy < minDistance) {
                minDistance = distanceToEnemy
                target = enemy
            }
        }
        return target
    }

    private setupKeysListeners() {
        this.scene.input.keyboard.on('keydown-SPACE', () => {
            this.isAttacking = true
            const target = this.findTarget(this.enemies)
            this.play('fight')
            this.setVelocity(0, 0)
            this.attack(target)
            this.drawEnemyHealthBar(target)
        })
    }

    attack(target: Entity) {
        const distanceToEnemy = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y)

        if (distanceToEnemy < 50) {
            target.takeDamage(25)
        }
    }

    update(delta: number) {
        const wasd = (this.scene as any).wasd; // Получаем WASD-клавиши
        const joystickKeys = (this.scene as any).joystick?.createCursorKeys(); // Получаем джойстик

        this.drawPlayerHealthBar();

        // Объединяем все управления
        const up = wasd.up.isDown || (joystickKeys && joystickKeys.up.isDown);
        const down = wasd.down.isDown || (joystickKeys && joystickKeys.down.isDown);
        const left = wasd.left.isDown || (joystickKeys && joystickKeys.left.isDown);
        const right = wasd.right.isDown || (joystickKeys && joystickKeys.right.isDown);

        // Рассчитываем скорость по осям
        let velocityX = 0;
        let velocityY = 0;

        if (up) velocityY = -1;
        if (down) velocityY = 1;
        if (left) velocityX = -1;
        if (right) velocityX = 1;

        // Нормализуем диагональное движение (чтобы скорость по диагонали не была больше)
        if (velocityX !== 0 && velocityY !== 0) {
            const length = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
            velocityX /= length;
            velocityY /= length;
        }

        // Применяем скорость
        if (velocityX !== 0 || velocityY !== 0) {
            socket.emit('playerMove', {
                x: this.x,
                y: this.y,
            });

            // Определяем анимацию
            if (Math.abs(velocityY) > Math.abs(velocityX)) {
                this.play(velocityY > 0 ? 'down' : 'up', true);
            } else {
                this.play(velocityX > 0 ? 'right' : 'left', true);
            }

            this.setVelocity(
                velocityX * delta * this.moveSpeed,
                velocityY * delta * this.moveSpeed
            );
        } else if (this.isAttacking) {
            this.setVelocity(0, 0);
        } else {
            this.setVelocity(0, 0);
            this.stop();
        }
    }
}
