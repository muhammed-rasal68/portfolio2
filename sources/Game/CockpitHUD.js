import { Game } from './Game.js'
import { View } from './View.js'

/**
 * Cockpit HUD — DOM speedometer / RPM + side buttons.
 * Visible only in driver view. Buttons work with mouse + touch.
 */
export class CockpitHUD
{
    constructor()
    {
        this.game = Game.getInstance()

        this.element = document.querySelector('.js-cockpit-hud')
        if(!this.element)
            return

        this.speedElement = this.element.querySelector('.js-cockpit-speed')
        this.rpmElement = this.element.querySelector('.js-cockpit-rpm')
        this.rpmFill = this.element.querySelector('.js-cockpit-rpm-fill')
        this.steerElement = this.element.querySelector('.js-cockpit-steer')

        this.setButtons()
        this.setVisibility()

        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        }, 9)
    }

    setButtons()
    {
        const hold = (selector, key) =>
        {
            const btn = this.element.querySelector(selector)
            if(!btn)
                return

            const down = (e) =>
            {
                e.preventDefault()
                e.stopPropagation()
                this.game.inputs.start(key)
                btn.classList.add('is-held')
            }
            const up = (e) =>
            {
                e.preventDefault()
                e.stopPropagation()
                this.game.inputs.end(key)
                btn.classList.remove('is-held')
            }

            btn.addEventListener('pointerdown', down)
            btn.addEventListener('pointerup', up)
            btn.addEventListener('pointercancel', up)
            btn.addEventListener('pointerleave', (e) =>
            {
                if(btn.classList.contains('is-held'))
                    up(e)
            })
            // Touch fallback for older browsers
            btn.addEventListener('touchstart', down, { passive: false })
            btn.addEventListener('touchend', up, { passive: false })
        }

        hold('.js-cockpit-boost', 'Keyboard.ShiftLeft')
        hold('.js-cockpit-brake', 'Keyboard.KeyB')
        hold('.js-cockpit-honk', 'Keyboard.KeyH')

        const camBtn = this.element.querySelector('.js-cockpit-cam')
        if(camBtn)
        {
            camBtn.addEventListener('click', (e) =>
            {
                e.preventDefault()
                e.stopPropagation()
                this.game.view.toggleMode()
            })
        }

        const resetBtn = this.element.querySelector('.js-cockpit-reset')
        if(resetBtn)
        {
            resetBtn.addEventListener('click', (e) =>
            {
                e.preventDefault()
                e.stopPropagation()
                // Recenter head
                if(this.game.view.driverLook)
                {
                    this.game.view.driverLook.yaw = 0
                    this.game.view.driverLook.pitch = 0
                    this.game.view.driverLook.fovTarget = this.game.view.driverLook.baseFov
                }
            })
        }
    }

    setVisibility()
    {
        const sync = (mode) =>
        {
            if(!this.element)
                return
            this.element.classList.toggle('is-active', mode === View.MODE_DRIVER)
        }

        // View may not exist yet when HUD is constructed — poll once
        const wait = () =>
        {
            if(this.game.view)
            {
                sync(this.game.view.mode)
                this.game.view.events.on('modeChange', sync)
            }
            else
            {
                requestAnimationFrame(wait)
            }
        }
        wait()
    }

    update()
    {
        if(!this.element || !this.element.classList.contains('is-active'))
            return

        const cockpit = this.game.world?.visualVehicle?.cockpit
        let kmh = cockpit?.speedKmh ?? 0
        let rpm = cockpit?.rpm ?? 0

        // Fallback if cockpit not ready yet
        if(!cockpit && this.game.physicalVehicle)
        {
            kmh = Math.max(0, (this.game.physicalVehicle.xzSpeed || 0) * 3.6)
            rpm = 0.9 + Math.abs(this.game.player?.accelerating || 0) * 2
        }

        if(this.speedElement)
            this.speedElement.textContent = String(Math.round(kmh))

        if(this.rpmElement)
            this.rpmElement.textContent = rpm.toFixed(1)

        if(this.rpmFill)
        {
            const frac = Math.min(1, Math.max(0, rpm / 8))
            this.rpmFill.style.transform = `scaleX(${frac.toFixed(3)})`
            this.rpmFill.classList.toggle('is-redline', rpm > 6)
        }

        if(this.steerElement && this.game.player)
        {
            const deg = (-this.game.player.steering * 90).toFixed(1)
            this.steerElement.style.transform = `rotate(${deg}deg)`
        }
    }
}
