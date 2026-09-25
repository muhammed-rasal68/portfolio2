import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { Track } from '../Tracks.js'
import { Trails } from '../Trails.js'
import { remapClamp } from '../utilities/maths.js'
import { cameraPosition, color, Fn, min, mix, normalWorld, positionViewDirection, positionWorld, reflector, screenCoordinate, texture, uniform, uv, vec2, vec3, vec4 } from 'three/tsl'
import { clamp } from 'three/src/math/MathUtils.js'
import gsap from 'gsap'
import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'
import { View } from '../View.js'

export class VisualVehicle
{
    constructor(model)
    {
        this.game = Game.getInstance()
        
        this.model = model

        this.setParts()
        this.setMainGroundTrack()
        this.setWheels()
        this.setBlinkers()
        this.setBackLights()
        this.setAntenna()
        this.setBoostTrails()
        this.setBoostAnimation()
        this.setCockpit()
        this.setScreenPosition()
        this.setPaints()

        this.tickCallback = () =>
        {
            this.update()
        }
        this.game.ticker.events.on('tick', this.tickCallback, 8)
    }

    destroy()
    {
        this.game.ticker.events.off('tick', this.tickCallback)

        if(this.blinkers)
        {
            this.game.inputs.events.off('left', this.blinkers.leftCallback)
            this.game.inputs.events.off('right', this.blinkers.rightCallback)
        }

        for(let partName in this.parts)
        {
            const part = this.parts[partName]
            part.removeFromParent()
        }

        if(this.cockpit && this.cockpit.group)
            this.cockpit.group.removeFromParent()

        this.game.tracks.remove(this.mainGroundTrack)

        for(const wheel of this.wheels.items)
        {
            this.game.tracks.remove(wheel.groundTrack)
        }
    }

    setParts()
    {
        this.parts = {}

        const searchList = [
            'bodyPainted',
            'chassis',
            'blinkerLeft',
            'blinkerRight',
            'stopLights',
            'backLights',
            'wheelContainer',
            'antenna',
            'cell1',
            'cell2',
            'cell3',
            'energy',
        ]
        for(let i = 0; i < searchList.length; i++)
        {
            searchList[i] = new RegExp(`^(${searchList[i]})`, 'i')
        }

        this.model.traverse((child) =>
        {
            if(child.isMesh)
            {
                child.receiveShadow = true
                child.castShadow = true
                child.material.shadowSide = THREE.BackSide
            }

            for(const search of searchList)
            {
                const match = child.name.match(search)

                if(match)
                {
                    this.parts[match[0]] = child
                }
            }
        })

        // Chassis
        this.parts.chassis.rotation.reorder('YXZ')
        this.game.materials.updateObject(this.parts.chassis)
        this.game.scene.add(this.parts.chassis)

        // Blinker left
        if(this.parts.blinkerLeft)
            this.parts.blinkerLeft.visible = false

        // Blinker right
        if(this.parts.blinkerRight)
            this.parts.blinkerRight.visible = false

        // Stop lights
        if(this.parts.stopLights)
            this.parts.stopLights.visible = false

        // Back lights
        if(this.parts.backLights)
            this.parts.backLights.visible = false

        // Wheel
        this.game.materials.updateObject(this.parts.wheelContainer)
    }

    setPaints()
    {
        this.paints = {}

        this.paints.choices = {}
        this.paints.choices.red = this.game.materials.getFromName('redGradient')
        this.paints.choices.orange = this.game.materials.createGradient('orangeGradient', '#ff940d', '#af0071', this.game.materials.debugPanel?.addFolder({ title: 'orangeGradient' }))
        this.paints.choices.white = this.game.materials.createGradient('whiteGradient', '#ffffff', '#b5b5b5', this.game.materials.debugPanel?.addFolder({ title: 'whiteGradient' }))
        this.paints.choices.black = this.game.materials.createGradient('blackGradient', '#626262', '#262526', this.game.materials.debugPanel?.addFolder({ title: 'blackGradient' }))
        
        // Flames
        {
            const material = this.paints.choices.red.clone()
            const baseOutput = material.outputNode
            const colorA = uniform(color('#ff9c20'))
            const colorB = uniform(color('#ff0000'))
            const emissiveStrength = uniform(7.75)

            material.outputNode = Fn(() =>
            {
                // Flames
                {
                    const newUv = uv(1).toVar()
                    const uv3 = newUv.sub(vec2(0, this.game.ticker.elapsedScaledUniform.mul(-0.075))).mul(vec2(0.96 * 1.3, 0.35 * 1.3))
                    const noise3 = texture(this.game.noises.voronoi, uv3).r

                    const uv4 = newUv.sub(vec2(0, this.game.ticker.elapsedScaledUniform.mul(-0.041))).mul(vec2(1.28 * 1.3, 0.75 * 1.3))
                    const noise4 = texture(this.game.noises.voronoi, uv4).r

                    const noiseFinal = min(noise3, noise4)
                    const stepTreshold = newUv.y.oneMinus()
                    const flameMix = noiseFinal.step(stepTreshold)

                    const flameColor = mix(colorA, colorB, newUv.y).mul(emissiveStrength)

                    baseOutput.rgb.assign(mix(baseOutput.rgb, flameColor, flameMix))
                }


                return baseOutput
            })()

            this.paints.choices.flames = material

            // Debug
            if(this.game.debug.active && this.game.materials.debugPanel)
            {
                const debugPanel = this.game.materials.debugPanel.addFolder({
                    title: 'flames',
                    expanded: true,
                })
                this.game.debug.addThreeColorBinding(debugPanel, colorA.value, 'flamesColorA')
                this.game.debug.addThreeColorBinding(debugPanel, colorB.value, 'flamesColorB')
                debugPanel.addBinding(emissiveStrength, 'value', { label: 'emissiveStrength', min: 1, max: 10, step: 0.001 })
            }
        }
        
        // Abyssal
        {
            const material = new THREE.MeshBasicMaterial({ wireframe: false })
            const fresnelColor = uniform(color('#6053ff'))
            const fresnelIntensity = uniform(30)
            const starsIntensity = uniform(10)

            material.outputNode = Fn(() =>
            {
                const starsUv = screenCoordinate.div(256).fract()
                const starsColor = texture(this.game.resources.behindTheSceneStarsTexture, starsUv).rgb.pow(2).mul(starsIntensity)
				
                const viewDirection = positionWorld.sub( cameraPosition ).normalize();
                const fresnel = viewDirection.dot(normalWorld).remapClamp(-0.2, -0.4, 1, 0)
                
                const fresnelFinalColor = fresnelColor.mul(fresnelIntensity)
                const finalColor = mix(starsColor, fresnelFinalColor, fresnel)

                finalColor.assign(MeshDefaultMaterial.revealDiscardNodeBuilder(this.game, finalColor))

                return vec4(finalColor, 1)
            })()

            this.paints.choices.abyssal = material

            // Debug
            if(this.game.debug.active && this.game.materials.debugPanel)
            {
                const debugPanel = this.game.materials.debugPanel.addFolder({
                    title: 'abyssal',
                    expanded: true,
                })
                this.game.debug.addThreeColorBinding(debugPanel, fresnelColor.value, 'fresnelColor')
                debugPanel.addBinding(fresnelIntensity, 'value', { label: 'fresnelIntensity', min: 1, max: 40, step: 0.001 })
                debugPanel.addBinding(starsIntensity, 'value', { label: 'starsIntensity', min: 1, max: 40, step: 0.001 })
            }
        }

        this.paints.changeTo = (name = 'red') =>
        {
            const material = this.paints.choices[name]

            if(!material)
                return false

            this.parts.bodyPainted.material = material

            for(const wheel of this.wheels.items)
            {
                if(wheel.painted)
                    wheel.painted.material = material
            }
        }
        
        // From achievemnts
        this.paints.changeTo(this.game.achievements.rewards.current.name)

        this.game.achievements.events.on('rewardActiveChange', (reward) =>
        {
            this.paints.changeTo(reward.name)
        })
    }

    setMainGroundTrack()
    {
        this.mainGroundTrack = this.game.tracks.add(new Track(1.5, 'g'))
    }

    setWheels()
    {
        // Setup
        this.wheels = {}
        this.wheels.items = []
        this.wheels.steering = 0

        // Create wheels
        for(let i = 0; i < 4; i++)
        {
            const wheel = {}

            // Clone group
            wheel.container = this.parts.wheelContainer.clone(true)
            this.parts.chassis.add(wheel.container)

            wheel.container.traverse((child) =>
            {
                if(child.name.match(/^wheelSuspension/))
                    wheel.suspension = child
                if(child.name.match(/^wheelCylinder/))
                    wheel.cylinder = child
                if(child.name.match(/^wheelPainted/))
                    wheel.painted = child
            })
            
            // Cylinder (actual wheel)
            wheel.cylinder.position.set(0, 0, 0)
            
            if(i === 0 || i === 2)
                wheel.container.rotation.y = Math.PI

            // Add new track
            wheel.groundTrack = this.game.tracks.add(new Track(0.5, 'r'))

            this.wheels.items.push(wheel)
        }
    }

    setBlinkers()
    {
        if(!this.parts.blinkerLeft)
            return
            
        this.blinkers = {}

        let running = false
        let on = false

        const start = () =>
        {
            if(running)
                return

            running = true
            on = true

            this.parts.blinkerLeft.visible = this.game.inputs.actions.get('left').active ? on : false
            this.parts.blinkerRight.visible = this.game.inputs.actions.get('right').active ? on : false

            gsap.delayedCall(0.8, blink)
        }

        const blink = () =>
        {
            on = !on

            this.parts.blinkerLeft.visible = this.game.inputs.actions.get('left').active ? on : false
            this.parts.blinkerRight.visible = this.game.inputs.actions.get('right').active ? on : false

            if(!this.game.inputs.actions.get('left').active && !this.game.inputs.actions.get('right').active && !on)
            {
                running = false
            }
            else
            {
                gsap.delayedCall(0.8, blink)
            }
        }

        this.blinkers.leftCallback = (active) =>
        {
            if(active.active)
                start()
        }
        
        this.blinkers.rightCallback = (active) =>
        {
            if(active.active)
                start()
        }

        this.game.inputs.events.on('left', this.blinkers.leftCallback)
        this.game.inputs.events.on('right', this.blinkers.rightCallback)
    }

    setBackLights()
    {
        this.backLights = {}
        this.backLights.material = new THREE.MeshBasicNodeMaterial({ colorNode: vec3(2.2) })
    }

    setAntenna()
    {
        if(!this.parts.antenna)
            return

        this.antenna = {}
        this.antenna.target = new THREE.Vector3(0, 2, 0)
        this.antenna.target = new THREE.Vector3(0, 2, 0)
        this.antenna.object = this.parts.antenna
        this.antenna.head = this.game.resources.vehicle.scene.getObjectByName('antennaHead')
        this.antenna.headAxle = this.antenna.head.children[0]
        this.antenna.headReference = this.antenna.object.getObjectByName('antennaHeadReference')

        this.game.materials.updateObject(this.antenna.head)
        this.game.scene.add(this.antenna.head)
    }

    setBoostTrails()
    {
        this.boostTrails = {}
        this.boostTrails.instance = new Trails()

        this.boostTrails.leftReference = new THREE.Object3D()
        this.boostTrails.leftReference.position.set(-1.28, 0.1, -0.55)
        this.parts.chassis.add(this.boostTrails.leftReference)

        this.boostTrails.left = this.boostTrails.instance.create()
        this.boostTrails.leftReference.getWorldPosition(this.boostTrails.left.position)
    
        this.boostTrails.rightReference = new THREE.Object3D()
        this.boostTrails.rightReference.position.set(-1.28, 0.1, 0.55)
        this.parts.chassis.add(this.boostTrails.rightReference)

        this.boostTrails.right = this.boostTrails.instance.create()
        this.boostTrails.rightReference.getWorldPosition(this.boostTrails.right.position)
    }

    setBoostAnimation()
    {
        this.boostAnimation = {}
        this.boostAnimation.mix = 0
        this.boostAnimation.speed = 1.2
        this.boostAnimation.mixUniform = uniform(0)

        // Energy
        if(this.parts.energy)
        {
            const emissiveOuput = this.game.materials.getFromName('emissivePurpleRadialGradient').outputNode
            const defaultOutput = this.parts.energy.material.outputNode

            const material = new THREE.MeshLambertNodeMaterial()
            material.outputNode = mix(defaultOutput, emissiveOuput, this.boostAnimation.mixUniform)

            this.parts.energy.material = material
        }
    }

    setScreenPosition()
    {
        this.screenPosition = new THREE.Vector2(0, 0)
    }

    /**
     * Full cockpit — procedural interior attached to the chassis.
     * Chassis-local axes: +X forward, +Y up, +Z side.
     * Driver sits at x ~ 0.1, z ~ +0.38. Dash ahead at x ~ 0.6.
     * Group is only visible in driver view so external cams stay clean.
     */
    setCockpit()
    {
        this.cockpit = {}
        this.cockpit.group = new THREE.Group()
        this.cockpit.group.visible = false
        this.parts.chassis.add(this.cockpit.group)

        const plastic = new THREE.MeshStandardMaterial({ color: '#1b1e26', roughness: 0.85, metalness: 0.15 })
        const plasticSoft = new THREE.MeshStandardMaterial({ color: '#262a35', roughness: 0.9, metalness: 0.05 })
        const accent = new THREE.MeshStandardMaterial({ color: '#0e0f13', roughness: 0.6, metalness: 0.3 })
        const glassMat = new THREE.MeshStandardMaterial({ color: '#8fb7d8', roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.28 })
        const chromeMat = new THREE.MeshStandardMaterial({ color: '#9aa2b1', roughness: 0.3, metalness: 0.9 })

        const addBox = (w, h, d, x, y, z, mat = plastic) =>
        {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
            mesh.position.set(x, y, z)
            this.cockpit.group.add(mesh)
            return mesh
        }

        // Dashboard main + top pad + cluster binnacle (in front of driver).
        // Car body in this space: x[-1.26, 1.45], y[-0.38, 0.63] — dash must
        // sit below eye (y 0.42) with its top ~0.30 so it frames the bottom.
        addBox(0.28, 0.16, 1.15, 0.45, 0.18, 0, plastic)
        addBox(0.14, 0.05, 1.15, 0.38, 0.28, 0, plasticSoft)
        addBox(0.16, 0.12, 0.45, 0.33, 0.30, 0.33, accent)

        // Door side panels (cockpit enclosure feel)
        addBox(0.85, 0.25, 0.06, -0.05, 0.10, 0.62, plasticSoft)
        addBox(0.85, 0.25, 0.06, -0.05, 0.10, -0.62, plasticSoft)

        // Center console + shifter
        addBox(0.50, 0.18, 0.22, 0.0, -0.02, 0, accent)
        const shifter = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.18, 10), chromeMat)
        shifter.position.set(-0.05, 0.15, 0)
        shifter.rotation.z = -0.25
        this.cockpit.group.add(shifter)
        const shiftKnob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 12), new THREE.MeshStandardMaterial({ color: '#c81e3a', roughness: 0.35 }))
        shiftKnob.position.set(-0.08, 0.23, 0)
        this.cockpit.group.add(shiftKnob)

        // Side console 3D buttons (decorative — real input via HUD DOM)
        const btnGeo = new THREE.BoxGeometry(0.06, 0.03, 0.06)
        const btnDefs = [
            { color: '#a855f7', x: 0.10, z: 0.06 },  // boost
            { color: '#ef4444', x: 0.10, z: -0.02 }, // brake
            { color: '#facc15', x: 0.10, z: -0.10 }, // honk
        ]
        this.cockpit.consoleButtons = []
        for(const def of btnDefs)
        {
            const m = new THREE.Mesh(btnGeo, new THREE.MeshBasicMaterial({ color: def.color }))
            m.position.set(def.x, 0.08, def.z)
            this.cockpit.group.add(m)
            this.cockpit.consoleButtons.push(m)
        }

        // Windshield frame: A-pillars (dash top -> roof) + top bar + mirror.
        // Roof skin is at y ~0.63, so the bar sits just under it.
        const pillarGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.38, 8)
        for(const z of [0.55, -0.55])
        {
            const pillar = new THREE.Mesh(pillarGeo, plastic)
            pillar.position.set(0.35, 0.45, z)
            pillar.rotation.z = -0.30
            this.cockpit.group.add(pillar)
        }
        addBox(0.08, 0.05, 1.18, 0.24, 0.60, 0, plastic)
        const mirror = addBox(0.04, 0.08, 0.26, 0.27, 0.50, 0, accent)
        mirror.material = plastic
        const mirrorGlass = new THREE.Mesh(
            new THREE.PlaneGeometry(0.22, 0.06),
            new THREE.MeshBasicMaterial({ color: '#bcd6e8' })
        )
        mirrorGlass.position.set(0.248, 0.50, 0)
        mirrorGlass.rotation.y = -Math.PI / 2
        this.cockpit.group.add(mirrorGlass)
        // Windshield glass (very transparent, gives reflections / enclosure)
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.32), glassMat)
        windshield.position.set(0.33, 0.45, 0)
        windshield.rotation.y = -Math.PI / 2
        this.cockpit.group.add(windshield)

        // Steering column + wheel (torus facing the driver, axis ~ X).
        // Wheel center ~0.34m from the eye, radius 0.13 -> fills lower-center
        // naturally instead of half the screen.
        const column = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.24, 10), chromeMat)
        column.position.set(0.26, 0.22, 0.33)
        column.rotation.z = Math.PI / 2 - 0.35
        this.cockpit.group.add(column)

        this.cockpit.steeringGroup = new THREE.Group()
        this.cockpit.steeringGroup.position.set(0.15, 0.26, 0.33)
        this.cockpit.steeringGroup.rotation.y = Math.PI / 2
        this.cockpit.steeringGroup.rotation.x = 0.35 // tilt toward driver
        this.cockpit.group.add(this.cockpit.steeringGroup)

        const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 12, 32), plastic)
        this.cockpit.steeringGroup.add(wheelRim)
        const spokeGeo = new THREE.BoxGeometry(0.026, 0.24, 0.018)
        const spoke = new THREE.Mesh(spokeGeo, accent)
        this.cockpit.steeringGroup.add(spoke)
        const spoke2 = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.02, 0.02), accent)
        spoke2.position.set(0, -0.07, 0.01)
        spoke2.scale.x = 1
        this.cockpit.steeringGroup.add(spoke2)
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 16), new THREE.MeshStandardMaterial({ color: '#c81e3a', roughness: 0.4 }))
        hub.rotation.x = Math.PI / 2
        this.cockpit.steeringGroup.add(hub)
        // Steering paddle glow (boost indicator)
        this.cockpit.steerGlow = new THREE.Mesh(
            new THREE.TorusGeometry(0.13, 0.008, 8, 32),
            new THREE.MeshBasicMaterial({ color: '#a855f7', transparent: true, opacity: 0 })
        )
        this.cockpit.steeringGroup.add(this.cockpit.steerGlow)

        // Gauges: two canvas-texture dials on the binnacle, facing the driver (-X)
        const makeGauge = (z) =>
        {
            const canvas = document.createElement('canvas')
            canvas.width = 256
            canvas.height = 256
            const ctx = canvas.getContext('2d')
            const tex = new THREE.CanvasTexture(canvas)
            tex.colorSpace = THREE.SRGBColorSpace
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(0.17, 0.17),
                new THREE.MeshBasicMaterial({ map: tex, transparent: true })
            )
            mesh.position.set(0.245, 0.31, z)
            mesh.rotation.y = -Math.PI / 2
            this.cockpit.group.add(mesh)
            return { canvas, ctx, tex, mesh }
        }
        this.cockpit.speedGauge = makeGauge(0.25)
        this.cockpit.rpmGauge = makeGauge(0.41)
        this.cockpit.speedKmh = 0
        this.cockpit.rpm = 0
        this.cockpit._gaugeTimer = 0
        this.drawGauge(this.cockpit.speedGauge, 0, 220, 'km/h', 'SPEED', false)
        this.drawGauge(this.cockpit.rpmGauge, 0, 8, 'x1000', 'RPM', true)

        // Dashboard glow strip
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 1.0), new THREE.MeshBasicMaterial({ color: '#38e1ff' }))
        strip.position.set(0.305, 0.22, 0)
        this.cockpit.group.add(strip)
        this.cockpit.dashStrip = strip
    }

    drawGauge(gauge, value, max, unit, label, isRpm)
    {
        const { ctx, tex } = gauge
        const S = 256
        ctx.clearRect(0, 0, S, S)
        // Face
        ctx.beginPath()
        ctx.arc(128, 128, 120, 0, Math.PI * 2)
        ctx.fillStyle = '#101319'
        ctx.fill()
        ctx.lineWidth = 6
        ctx.strokeStyle = '#2a2f3a'
        ctx.stroke()
        // Ticks
        const a0 = Math.PI * 0.75
        const a1 = Math.PI * 2.25
        const ticks = isRpm ? 8 : 11
        for(let i = 0; i <= ticks; i++)
        {
            const t = i / ticks
            const a = a0 + (a1 - a0) * t
            const red = isRpm && t > 0.75
            ctx.strokeStyle = red ? '#ef4444' : '#9aa2b1'
            ctx.lineWidth = (i % 2 === 0) ? 5 : 2
            const r1 = 100
            const r2 = (i % 2 === 0) ? 82 : 90
            ctx.beginPath()
            ctx.moveTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1)
            ctx.lineTo(128 + Math.cos(a) * r2, 128 + Math.sin(a) * r2)
            ctx.stroke()
        }
        // Needle
        const frac = clamp(value / max, 0, 1)
        const na = a0 + (a1 - a0) * frac
        ctx.strokeStyle = '#ff3b30'
        ctx.lineWidth = 6
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(128, 128)
        ctx.lineTo(128 + Math.cos(na) * 88, 128 + Math.sin(na) * 88)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(128, 128, 12, 0, Math.PI * 2)
        ctx.fillStyle = '#e5e7eb'
        ctx.fill()
        // Text
        ctx.fillStyle = '#e5e7eb'
        ctx.font = 'bold 44px Nunito, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(isRpm ? value.toFixed(1) : String(Math.round(value)), 128, 190)
        ctx.fillStyle = '#7dd3fc'
        ctx.font = 'bold 22px Nunito, sans-serif'
        ctx.fillText(unit, 128, 214)
        ctx.fillStyle = '#6b7280'
        ctx.font = 'bold 18px Nunito, sans-serif'
        ctx.fillText(label, 128, 62)
        tex.needsUpdate = true
    }

    updateCockpit()
    {
        if(!this.cockpit || !this.cockpit.group)
            return

        const inDriver = this.game.view && this.game.view.mode === View.MODE_DRIVER
        this.cockpit.group.visible = !!inDriver
        if(!inDriver)
            return

        // Steering follows player input (max ~100deg)
        const target = -this.game.player.steering * 1.8
        this.cockpit.steeringGroup.rotation.z += (target - this.cockpit.steeringGroup.rotation.z) * Math.min(1, this.game.ticker.delta * 12)

        // Speed + RPM from physics
        const pv = this.game.physicalVehicle
        const kmh = clamp((pv.xzSpeed || 0) * 3.6, 0, 220)
        const accel = Math.abs(this.game.player.accelerating || 0)
        const boost = this.game.player.boosting ? 1 : 0
        const rpm = clamp(0.9 + accel * 2.2 + (kmh / 220) * 3.6 + boost * 1.2, 0, 8)
        this.cockpit.speedKmh = kmh
        this.cockpit.rpm = rpm

        // Boost glow on wheel + dash strip pulse
        if(this.cockpit.steerGlow)
            this.cockpit.steerGlow.material.opacity += ((boost ? 0.9 : 0) - this.cockpit.steerGlow.material.opacity) * Math.min(1, this.game.ticker.delta * 8)

        // Redraw gauges at ~12Hz
        this.cockpit._gaugeTimer += this.game.ticker.delta
        if(this.cockpit._gaugeTimer > 0.08)
        {
            this.cockpit._gaugeTimer = 0
            this.drawGauge(this.cockpit.speedGauge, kmh, 220, 'km/h', 'SPEED', false)
            this.drawGauge(this.cockpit.rpmGauge, rpm, 8, 'x1000', 'RPM', true)
        }
    }

    update()
    {
        const physicalVehicle = this.game.physicalVehicle

        this.updateCockpit()
        
        // Chassis
        this.parts.chassis.position.copy(physicalVehicle.position)
        this.parts.chassis.quaternion.copy(physicalVehicle.quaternion)
        
        // Wheels
        this.wheels.steering += ((this.game.player.steering * physicalVehicle.steeringAmplitude) - this.wheels.steering) * this.game.ticker.deltaScaled * 16

        const wheelsRotation = (physicalVehicle.forwardSpeed) / physicalVehicle.wheels.settings.radius * 0.006

        for(let i = 0; i < 4; i++)
        {
            const visualWheel = this.wheels.items[i]
            const physicalWheel = physicalVehicle.wheels.items[i]

            // visualWheel.container.position.copy(physicalWheel.basePosition)

            if(!this.game.inputs.actions.get('brake').active || this.game.inputs.actions.get('forward').active || this.game.inputs.actions.get('backward').active)
            {
                if(i === 0 || i === 2)
                    visualWheel.cylinder.rotation.z += wheelsRotation
                else
                    visualWheel.cylinder.rotation.z -= wheelsRotation
            }

            if(i === 0)
                visualWheel.container.rotation.y = Math.PI + this.wheels.steering

            if(i === 1)
                visualWheel.container.rotation.y = this.wheels.steering
  
            const suspensionLength = physicalWheel.suspensionLength
            let wheelY = physicalWheel.basePosition.y - suspensionLength
            wheelY = Math.min(wheelY, -0.5)

            visualWheel.container.position.x = physicalWheel.basePosition.x
            visualWheel.container.position.y += (wheelY - visualWheel.container.position.y) * 25 * this.game.ticker.deltaScaled
            visualWheel.container.position.z = physicalWheel.basePosition.z

            if(visualWheel.suspension)
            {
                const suspensionScale = Math.abs(visualWheel.container.position.y) - 0.5
                visualWheel.suspension.scale.y = suspensionScale
            }

            // Ground tracks
            visualWheel.groundTrack.update(physicalWheel.contactPoint, physicalWheel.inContact)
        }

        // Main ground track
        this.mainGroundTrack.update(physicalVehicle.position, physicalVehicle.position.y < 1.5)

        // Antenna
        if(this.antenna)
        {
            const angle = Math.atan2(this.antenna.target.x - physicalVehicle.position.x, this.antenna.target.z - physicalVehicle.position.z)
            this.antenna.object.rotation.y = angle - this.parts.chassis.rotation.y
            this.antenna.headReference.getWorldPosition(this.antenna.head.position)
            this.antenna.head.lookAt(this.antenna.target)

            const antennaTargetDistance = this.antenna.target.distanceTo(physicalVehicle.position)
            
            const antennaRotationSpeed = remapClamp(antennaTargetDistance, 50, 5, 1, 10)
            this.antenna.headAxle.rotation.z += this.game.ticker.deltaScaled * antennaRotationSpeed
        }

        // Stop/back lights
        if(this.game.player.braking)
        {
            if(this.parts.stopLights)
                this.parts.stopLights.visible = true

            if(this.parts.backLights)
            {
                this.parts.backLights.visible = true
                this.parts.backLights.material = this.game.materials.getFromName('emissiveOrangeRadialGradient')
            }
        }
        else
        {
            if(this.parts.stopLights)
                this.parts.stopLights.visible = false

            if(this.parts.backLights)
            {
                // Backward
                if(this.game.player.accelerating < 0)
                {
                    this.parts.backLights.visible = true
                    this.parts.backLights.material = this.backLights.material
                }
                // Backward
                else
                {
                    this.parts.backLights.visible = false
                }
            }
        }

        // Boost trails
        const trailAlpha = physicalVehicle.goingForward && this.game.player.boosting && this.game.player.accelerating > 0 ? 1 : 0
        this.boostTrails.leftReference.getWorldPosition(this.boostTrails.left.position)
        this.boostTrails.left.alpha = trailAlpha
        this.boostTrails.rightReference.getWorldPosition(this.boostTrails.right.position)
        this.boostTrails.right.alpha = trailAlpha

        // Boost animation
        this.boostAnimation.mix += (this.game.player.boosting ? 1 : - 1) * this.game.ticker.deltaScaled * this.boostAnimation.speed
        this.boostAnimation.mix = clamp(this.boostAnimation.mix, 0, 1)
        // this.boostAnimation.mixUniform.value = remapClamp(this.boostAnimation.mix, 0, 0.2, 0, 1)
        this.boostAnimation.mixUniform.value = 1 - Math.pow(1 - this.boostAnimation.mix, 7)
        if(this.parts.energy)
        {
            this.parts.cell1.position.y = remapClamp(this.boostAnimation.mix, 0, 0.6, 0.2, 0)
            this.parts.cell3.position.y = remapClamp(this.boostAnimation.mix, 0.2, 0.8, 0.2, 0)
            this.parts.cell2.position.y = remapClamp(this.boostAnimation.mix, 0.4, 1, 0.2, 0)
        }

        // Screen position
        const vector = new THREE.Vector3()
        vector.setFromMatrixPosition(this.parts.chassis.matrixWorld)
        vector.project(this.game.view.camera)

        this.screenPosition.x = (vector.x * 0.5 + 0.5)
        this.screenPosition.y = (vector.y * -0.5 + 0.5)
    }
}