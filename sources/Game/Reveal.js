import * as THREE from 'three/webgpu'
import { color, uniform, vec2 } from 'three/tsl'
import { Game } from './Game.js'
import gsap from 'gsap'

export class Reveal
{
    constructor()
    {
        this.game = Game.getInstance()
        
        this.step = -1
        const respawn = this.game.respawns.getDefault()
        this.position = respawn.position.clone()
        this.position2Uniform = uniform(vec2(this.position.x, this.position.z))
        this.distance = uniform(0)
        this.thickness = uniform(0.05)
        this.color = uniform(color('#e88eff'))
        this.intensity = uniform(5.5)
        this.intensityMultiplier = 1
        this.sound = this.game.audio.register({
            path: 'sounds/reveal/reveal-1.mp3',
            autoplay: false,
            loop: false,
            volume: 0.5,
            preload: true
        })

        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '📜 Reveal',
                expanded: false,
            })

            this.debugPanel.addBinding(this.distance, 'value', { label: 'distance', min: 0, max: 20, step: 0.01 })
            this.debugPanel.addBinding(this.thickness, 'value', { label: 'thickness', min: 0, max: 1, step: 0.001 })
            // this.game.debug.addThreeColorBinding(this.debugPanel, this.color.value, 'color')
            this.debugPanel.addBinding(this.intensity, 'value', { label: 'intensity', min: 1, max: 20, step: 0.001 })
        }

        this.update = this.update.bind(this)
        this.game.ticker.events.on('tick', this.update, 10)
    }

    updateStep(step)
    {
        const speedMultiplier = location.hash.match(/skip/i) ? 4 : 1

        // Step 0
        if(step === 0)
        {
            // Intro loader => Hide circle
            this.game.world.intro.circle.hide(() =>
            {
                // Grid
                this.game.world.grid.show()

                // Reveal
                this.distance.value = 0

                gsap.to(
                    this.distance,
                    {
                        value: 3.5,
                        ease: 'back.out(1.7)',
                        duration: 2 / speedMultiplier,
                        overwrite: true,
                    }
                )

                // View
                this.game.view.zoom.smoothedRatio = 0.6
                this.game.view.zoom.baseRatio = 0.6

                gsap.to(
                    this.game.view.zoom,
                    {
                        baseRatio: 0.3,
                        // smoothedRatio: 0.4,
                        ease: 'power1.inOut',
                        duration: 1.25 / speedMultiplier,
                        overwrite: true,
                    }
                )

                // Intro loader => Show label and sound button
                this.game.world.intro.setText()
                this.game.world.intro.setSoundButton()
                this.game.ticker.wait(1, () =>
                {
                    this.game.world.intro.showLabel()
                })

                // Cherry trees
                if(this.game.world.cherryTrees)
                    this.game.world.cherryTrees.leaves.seeThroughMultiplier = 0.5

                // Click
                if(location.hash.match(/skip/i))
                {
                    this.updateStep(1)
                }
                else
                {
                    // Next function
                    const next = () =>
                    {
                        this.updateStep(1)
                        this.game.inputs.events.off('introStart', inputCallback)
                        this.game.rayCursor.removeIntersect(intersect)
                    }

                    // Input callback
                    const inputCallback = () =>
                    {
                        next()
                    }

                    // Intsect
                    const position = this.position.clone()
                    position.y = 0
                    
                    const intersect = this.game.rayCursor.addIntersect({
                        active: true,
                        shape: new THREE.Sphere(position, 3.5),
                        onClick: next,
                        onEnter: () =>
                        {
                            gsap.to(this, { intensityMultiplier: 1.22, duration: 0.2, overwrite: true })
                        },
                        onLeave: () =>
                        {
                            gsap.to(this, { intensityMultiplier: 1, duration: 0.2, overwrite: true })
                        }
                    })
                    
                    // Inputs (for gamepad and keyboard)
                    this.game.inputs.addActions([
                        { name: 'introStart', categories: [ 'intro' ], keys: [ 'Gamepad.cross', 'Keyboard.Enter', 'Keyboard.ArrowUp', 'Keyboard.ArrowDown', 'Keyboard.KeyW', 'Keyboard.KeyD' ] },
                    ])

            // { name: 'forward',               categories: [ 'wandering', 'racing', 'cinematic' ], keys: [ 'Keyboard.ArrowUp', 'Keyboard.KeyW', 'Gamepad.up', 'Gamepad.r2' ] },
            // { name: 'right',                 categories: [ 'wandering', 'racing', 'cinematic' ], keys: [ 'Keyboard.ArrowRight', 'Keyboard.KeyD', 'Gamepad.right' ] },
                    this.game.inputs.events.on('introStart', inputCallback)
                }
            })
        }
        else if(step === 1)
        {
            // Audio
            this.game.audio.init()
            this.sound.play()

            // Reveal
            gsap.to(
                this.distance,
                {
                    value: 30,
                    ease: 'back.in(1.3)',
                    duration: 2 / speedMultiplier,
                    overwrite: true,
                    onComplete: () =>
                    {
                        this.distance.value = 99999
                    }
                }
            )

            // Intro loader => Hide label
            this.game.world.intro.hideLabel()

            // Inputs
            this.game.inputs.filters.clear()
            this.game.inputs.filters.add('wandering')

            // View
            this.game.view.focusPoint.isTracking = true
            this.game.view.focusPoint.magnet.active = false

            // View
            gsap.to(
                this.game.view.zoom,
                {
                    baseRatio: 0,
                    // smoothedRatio: 0,
                    ease: 'back.in(1.5)',
                    duration: 1.75 / speedMultiplier,
                    overwrite: true,
                    onComplete: () =>
                    {
                        this.updateStep(2)
                    }
                }
            )

            // Cherry trees
            if(this.game.world.cherryTrees)
            {
                gsap.to(
                    this.game.world.cherryTrees.leaves,
                    {
                        seeThroughMultiplier: 1,
                        ease: 'power1.inOut',
                        duration: 2 / speedMultiplier,
                        overwrite: true
                    }
                )
            }
        }
        else if(step === 2)
        {
            this.game.interactivePoints.recover()
            
            this.game.world.step(2)
            this.game.world.grid.destroy()
            this.game.world.intro.destroy()
            this.game.world.intro = null

            this.game.overlay.moveOnTop()

            this.game.server.start()

            this.game.menu.preopen()

            this.game.ticker.events.off('tick', this.update)

            // Show changelog notification once (draggable, closable)
            if(!localStorage.getItem('changelogShown_v3'))
            {
                const notification = document.querySelector('.js-changelog-notification')
                const closeBtn = document.querySelector('.js-changelog-close')
                const header = document.querySelector('.js-changelog-header')

                if(notification && closeBtn && !notification.dataset.changelogWired)
                {
                    notification.dataset.changelogWired = '1'

                    setTimeout(() =>
                    {
                        notification.classList.add('is-visible')
                    }, 1500)

                    const close = () =>
                    {
                        if(!notification.classList.contains('is-visible'))
                            return
                        notification.classList.remove('is-visible')
                        notification.classList.add('is-leaving')
                        localStorage.setItem('changelogShown_v3', '1')
                    }

                    closeBtn.addEventListener('click', (e) =>
                    {
                        e.stopPropagation()
                        close()
                    })

                    notification.addEventListener('click', (e) =>
                    {
                        if(e.target === notification)
                            close()
                    })

                    document.addEventListener('keydown', (e) =>
                    {
                        if(e.key === 'Escape')
                            close()
                    })

                    // Drag via header (mouse + touch through Pointer Events)
                    if(header)
                    {
                        let dragging = false
                        let startX = 0
                        let startY = 0
                        let baseX = 0
                        let baseY = 0

                        header.addEventListener('pointerdown', (e) =>
                        {
                            if(e.target.closest('.js-changelog-close'))
                                return
                            if(!notification.classList.contains('is-visible'))
                                return

                            const rect = notification.getBoundingClientRect()
                            notification.style.left = `${rect.left}px`
                            notification.style.top = `${rect.top}px`
                            notification.style.transform = 'none'

                            dragging = true
                            startX = e.clientX
                            startY = e.clientY
                            baseX = rect.left
                            baseY = rect.top
                            notification.classList.add('is-dragging')

                            if(header.setPointerCapture && e.pointerId !== undefined)
                            {
                                try { header.setPointerCapture(e.pointerId) } catch(_err) { /* noop */ }
                            }
                            e.preventDefault()
                        })

                        header.addEventListener('pointermove', (e) =>
                        {
                            if(!dragging)
                                return

                            const width = notification.offsetWidth
                            const height = notification.offsetHeight
                            const nextX = Math.min(
                                Math.max(baseX + (e.clientX - startX), -width + 60),
                                window.innerWidth - 60
                            )
                            const nextY = Math.min(
                                Math.max(baseY + (e.clientY - startY), 0),
                                window.innerHeight - 40
                            )
                            notification.style.left = `${nextX}px`
                            notification.style.top = `${nextY}px`
                        })

                        const endDrag = () =>
                        {
                            if(!dragging)
                                return
                            dragging = false
                            notification.classList.remove('is-dragging')
                        }

                        header.addEventListener('pointerup', endDrag)
                        header.addEventListener('pointercancel', endDrag)
                    }
                }
            }
        }

        this.step = step
    }

    update()
    {
        this.color.value.copy(this.game.dayCycles.properties.revealColor.value)
        this.intensity.value = this.game.dayCycles.properties.revealIntensity.value * this.intensityMultiplier
    }
}