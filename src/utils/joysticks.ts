import VirtualJoyStickPlugin from 'phaser3-rex-plugins/plugins/virtualjoystick-plugin'
import { Player } from '../entities/player'

export class JoysticksController {
    private scene: Phaser.Scene
    //private player: Player;
    private spellJoysticksArr: any[] = [] // Все джойстики, которые должны блокировать друг друга
    private moveJoystick: any // Джойстик движения (никогда не блокируется)
    private activeSpellJoystick: any = null // Текущий активный джойстик (включая viewAngleJoystick)

    constructor(scene: Phaser.Scene, _player?: Player) {
        this.scene = scene
        //this.player = player;
    }

    createJoysticks() {
        const mainCameraIgnoreList = [];
        const joystickPlugin = this.scene.plugins.get('rexVirtualJoystick') as VirtualJoyStickPlugin;

        // 1. Джойстик движения (никогда не блокируется)
        this.moveJoystick = joystickPlugin.add(this.scene, {
            x: 90,
            y: window.innerHeight - 120,
            radius: 55,
            base: this.scene.add.circle(0, 0, 55, 0x888888),
            thumb: this.scene.add.circle(0, 0, 28, 0xcccccc),
            dir: '8dir',
            fixed: true,
        })
        mainCameraIgnoreList.push(this.moveJoystick.base, this.moveJoystick.thumb)

        // 2. Джойстик направления взгляда (блокирует заклинания и наоборот)
        const viewAngleJoystick = this.createBlockingJoystick(
            joystickPlugin,
            window.innerWidth - 65,
            window.innerHeight - 100,
            35,
            23
        )
        mainCameraIgnoreList.push(viewAngleJoystick.base, viewAngleJoystick.thumb)

        // 3. Джойстики заклинаний (блокируют взгляд и друг друга)
        const spellJoystick1 = this.createBlockingJoystick(
            joystickPlugin,
            window.innerWidth - 150,
            window.innerHeight - 88,
            25,
            23
        )
        const spellJoystick2 = this.createBlockingJoystick(
            joystickPlugin,
            window.innerWidth - 128,
            window.innerHeight - 157,
            25,
            23
        )
        const spellJoystick3 = this.createBlockingJoystick(
            joystickPlugin,
            window.innerWidth - 55,
            window.innerHeight - 184,
            25,
            23
        )
        const spellJoystick4 = this.createBlockingJoystick(
            joystickPlugin,
            window.innerWidth - 55,
            window.innerHeight - 258,
            25,
            23
        )

        mainCameraIgnoreList.push(
            spellJoystick1.base,
            spellJoystick1.thumb,
            spellJoystick2.base,
            spellJoystick2.thumb,
            spellJoystick3.base,
            spellJoystick3.thumb,
            spellJoystick4.base,
            spellJoystick4.thumb
        )

        // Все джойстики, которые должны блокировать друг друга
        this.spellJoysticksArr.push(viewAngleJoystick, spellJoystick1, spellJoystick2, spellJoystick3, spellJoystick4)

        this.scene.cameras.main.ignore(mainCameraIgnoreList)
    }

    // Создает джойстик, который блокирует другие при активации
    private createBlockingJoystick(
        plugin: VirtualJoyStickPlugin,
        x: number,
        y: number,
        baseRadius: number,
        thumbRadius: number
    ) {
        const joystick = plugin.add(this.scene, {
            x: x,
            y: y,
            radius: baseRadius,
            base: this.scene.add.circle(0, 0, baseRadius, 0x888888).setInteractive(), // Добавляем интерактивность
            thumb: this.scene.add.circle(0, 0, thumbRadius, 0xcccccc),
            dir: '8dir',
            fixed: true,
            forceMin: 16,
        })

        // Явно настраиваем зону взаимодействия для base
        joystick.base.setInteractive(new Phaser.Geom.Circle(0, 0, baseRadius), Phaser.Geom.Circle.Contains)

        joystick.on('pointerdown', () => {
            if (!this.activeSpellJoystick) {
                this.activeSpellJoystick = joystick
                this.disableOtherSpellJoysticks(joystick)
            }
        })

        joystick.on('pointerup', () => {
            if (this.activeSpellJoystick === joystick) {
                const angle = joystick.angle
                const force = joystick.force

                if (joystick === this.spellJoysticksArr[0]) {
                    // Обработка viewAngleJoystick
                    // this.player.updateLookDirection(angle);
                } else {
                    this.castSpell(angle, force)
                }

                this.activeSpellJoystick = null
                this.enableAllSpellJoysticks()
            }
        })

        return joystick
    }

    private disableOtherSpellJoysticks(activeJoystick: any) {
        this.spellJoysticksArr.forEach((joystick) => {
            if (joystick !== activeJoystick) {
                joystick.setEnable(false)
                joystick.base.setAlpha(0.5)
                joystick.thumb.setAlpha(0.5)
            }
        })
    }

    private enableAllSpellJoysticks() {
        this.spellJoysticksArr.forEach((joystick) => {
            joystick.setEnable(true)
            joystick.base.setAlpha(1)
            joystick.thumb.setAlpha(1)
        })
    }

    private castSpell(angle: number, force: number) {
        //this.player.castSpell(angle, force);
        console.log(`Casting spell at angle ${angle} with force ${force}`)
    }
}
