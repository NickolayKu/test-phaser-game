import socket from '../utils/socket';
import { Entity } from './entity';

type SpriteType = {
    [key: string]: string;
    base: string;
    fight?: string;
};

export class Player extends Entity {
    textureKey: string;
    private moveSpeed: number;
    enemies: Entity[];
    target: Entity;
    private isAttacking: boolean;
    playerHealthBar: Phaser.GameObjects.Graphics;
    enemyHealthBar: Phaser.GameObjects.Graphics;
    private joysticksController: any;
    private wasdController: any;
    private directionLine: Phaser.GameObjects.Graphics; // Линия направления взгляда
    //private facing: 'right'; // left | right

    constructor(scene: Phaser.Scene, x: number, y: number, texture: SpriteType, joysticksController: any, wasd: any) {
        super(scene, x, y, texture.base);

        const anims = this.scene.anims;
        const animsFrameRate = 9;
        this.moveSpeed = 200; // Фиксированная скорость (пикселей в секунду)
        this.setSize(28, 32);
        this.setOffset(10, 16);
        this.setScale(0.9);
        this.joysticksController = joysticksController;
        this.wasdController = wasd;

        // Создаем линию направления взгляда
        this.directionLine = this.scene.add.graphics();
        this.directionLine.setDepth(10); // Чтобы линия была выше других объектов

        this.setupKeysListeners();
        this.createAnimation('down', texture.base, 0, 2, anims, animsFrameRate);
        this.createAnimation('left', texture.base, 12, 14, anims, animsFrameRate);
        this.createAnimation('right', texture.base, 24, 26, anims, animsFrameRate);
        this.createAnimation('up', texture.base, 36, 38, anims, animsFrameRate);
        this.createAnimation('fight', texture.fight, 3, 6, anims, animsFrameRate, 0);
        this.drawPlayerHealthBar();

        this.on('animationcomplete', () => {
            this.isAttacking = false;
        });
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

    update(_delta: number) {
        this.drawPlayerHealthBar();

        // Движение через moveJoystick (фиксированная скорость)
        const moveJoystick = this.joysticksController.moveJoystick;
        let velocityX = 0;
        let velocityY = 0;

        // Обработка WASD (если джойстик неактивен или его нет)
        const isWASDPressed = 
            this.wasdController.up.isDown || 
            this.wasdController.down.isDown || 
            this.wasdController.left.isDown || 
            this.wasdController.right.isDown;

        if ((moveJoystick && !this.isAttacking) || (isWASDPressed && !this.isAttacking)) {
            // Если джойстик активен, двигаемся с фиксированной скоростью
            if (moveJoystick.force > 0.1) { // Мертвая зона
                const angleRad = moveJoystick.angle * Phaser.Math.DEG_TO_RAD;
                velocityX = Math.cos(angleRad) * this.moveSpeed;
                velocityY = Math.sin(angleRad) * this.moveSpeed;
            } else if (isWASDPressed) {
                if (this.wasdController.up.isDown) velocityY -= this.moveSpeed;
                if (this.wasdController.down.isDown) velocityY += this.moveSpeed;
                if (this.wasdController.left.isDown) velocityX -= this.moveSpeed;
                if (this.wasdController.right.isDown) velocityX += this.moveSpeed;
                
                // Нормализация скорости (чтобы при диагональном движении скорость не была выше)
                if (velocityX !== 0 && velocityY !== 0) {
                    const len = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
                    velocityX = (velocityX / len) * this.moveSpeed;
                    velocityY = (velocityY / len) * this.moveSpeed;
                }
            }

            // Применяем скорость
            this.setVelocity(velocityX, velocityY);

            // Анимация движения
            if (velocityX !== 0 || velocityY !== 0) {
                if (Math.abs(velocityY) > Math.abs(velocityX)) {
                    this.play(velocityY > 0 ? 'down' : 'up', true);
                } else {
                    this.play(velocityX > 0 ? 'right' : 'left', true);
                }
            }

            // Отправка данных на сервер
            socket.emit('playerMove', { x: this.x, y: this.y });
        } else if (this.isAttacking) {
            this.setVelocity(0, 0);
        } else {
            this.setVelocity(0, 0);
            this.stop();
        }

        // Направление взгляда через viewAngleJoystick (синяя линия)
        const viewAngleJoystick = this.joysticksController.spellJoysticksArr[0];
        this.directionLine.clear(); // Очищаем предыдущую линию

        if (viewAngleJoystick && viewAngleJoystick.force > 0.3) {
            const angleRad = viewAngleJoystick.angle * Phaser.Math.DEG_TO_RAD;
            const lineLength = 50; // Длина линии направления

            // Рисуем линию от центра персонажа
            this.directionLine.lineStyle(3, 0x3498db); // Синяя линия (толщина 3px)
            this.directionLine.beginPath();
            this.directionLine.moveTo(this.x, this.y);
            this.directionLine.lineTo(
                this.x + Math.cos(angleRad) * lineLength,
                this.y + Math.sin(angleRad) * lineLength
            );
            this.directionLine.strokePath();
        }
    }
}
