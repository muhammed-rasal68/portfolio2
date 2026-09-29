import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import socialData from '../../../data/social.js'
import { InstancedGroup } from '../../InstancedGroup.js'
import { Area } from './Area.js'
import { View } from '../../View.js'

export class SocialArea extends Area
{
    constructor(model)
    {
        super(model)

        this.center = this.references.items.get('center')[0].position

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '👨‍🦲 Social',
                expanded: false,
            })
        }

        this.setLinks()
        this.setInstagramLogo()
        this.setFans()
        this.setOnlyFans()
        this.setStatue()
        // this.setFWA()
        this.setAchievement()
    }

    setLinks()
    {
        const nameToPrefix = {
            'Mail': 'mail',
            'X': 'x',
            'Instagram': 'bluesky', // reuses BlueSky pedestal mesh position (no instagram mesh in GLB)
            'Discord': 'discord',
            'YouTube': 'youtube',
            'Twitch': 'twitch',
            'GitHub': 'gitHub',
        }

        const socialPositions = {}
        for(const object of this.objects.items)
        {
            if(object.visual)
            {
                const childName = object.visual.object3D.name
                for(const [name, prefix] of Object.entries(nameToPrefix))
                {
                    if(childName.toLowerCase().startsWith(prefix.toLowerCase()))
                    {
                        const position = object.visual.object3D.position.clone()
                        position.y = 1
                        socialPositions[name] = position
                        break
                    }
                }
            }
        }

        for(const link of socialData)
        {
            const position = socialPositions[link.name] || this.center.clone()

            this.interactivePoint = this.game.interactivePoints.create(
                position,
                link.name,
                link.align === 'left' ? InteractivePoints.ALIGN_LEFT : InteractivePoints.ALIGN_RIGHT,
                InteractivePoints.STATE_CONCEALED,
                () =>
                {
                    if(link.name === 'GitHub' || link.name === 'Mail' || link.name === 'Instagram')
                    {
                        window.open(link.url, '_blank')
                    }
                    else
                    {
                        this.game.notifications.show(
                            /* html */`
                                <div class="top">
                                    <div class="title">${link.name}</div>
                                </div>
                                <div class="bottom">
                                    <div class="description">Coming Soon</div>
                                </div>
                            `,
                            '',
                            3
                        )
                    }
                },
                () =>
                {
                    this.game.inputs.interactiveButtons.addItems(['interact'])
                },
                () =>
                {
                    this.game.inputs.interactiveButtons.removeItems(['interact'])
                },
                () =>
                {
                    this.game.inputs.interactiveButtons.removeItems(['interact'])
                }
            )
        }
    }

    setInstagramLogo()
    {
        // The BlueSky logo mesh is baked into areas-compressed.glb (node
        // blueskyPhysicalDynamic -> Plane.090, palette material), so there is
        // no separate texture file to swap. Re-skin that mesh in code with an
        // Instagram badge, keeping the same geometry/physics pedestal.
        let blueskyObject = null
        for(const object of this.objects.items)
        {
            if(object.visual && object.visual.object3D.name.toLowerCase().startsWith('bluesky'))
            {
                blueskyObject = object
                break
            }
        }

        if(!blueskyObject)
            return

        const size = 512
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')

        // Transparent background
        ctx.clearRect(0, 0, size, size)

        // Instagram gradient rounded square
        const pad = 36
        const grad = ctx.createLinearGradient(pad, size - pad, size - pad, pad)
        grad.addColorStop(0, '#feda75')
        grad.addColorStop(0.35, '#fa7e1e')
        grad.addColorStop(0.6, '#d62976')
        grad.addColorStop(0.8, '#962fbf')
        grad.addColorStop(1, '#4f5bd5')

        const roundRect = (x, y, w, h, r) =>
        {
            ctx.beginPath()
            ctx.moveTo(x + r, y)
            ctx.arcTo(x + w, y, x + w, y + h, r)
            ctx.arcTo(x + w, y + h, x, y + h, r)
            ctx.arcTo(x, y + h, x, y, r)
            ctx.arcTo(x, y, x + w, y, r)
            ctx.closePath()
        }

        roundRect(pad, pad, size - pad * 2, size - pad * 2, 120)
        ctx.fillStyle = grad
        ctx.fill()

        // White camera outline
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 34
        roundRect(116, 116, size - 232, size - 232, 90)
        ctx.stroke()

        // Lens
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, 78, 0, Math.PI * 2)
        ctx.lineWidth = 32
        ctx.stroke()

        // Flash dot
        ctx.beginPath()
        ctx.arc(size - 168, 168, 26, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()

        const texture = new THREE.CanvasTexture(canvas)
        texture.colorSpace = THREE.SRGBColorSpace

        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true })

        blueskyObject.visual.object3D.traverse((child) =>
        {
            if(child.isMesh)
                child.material = material
        })
    }

    setFans()
    {
        const baseFan = this.references.items.get('fan')[0]
        baseFan.castShadow = true
        baseFan.receiveShadow = true

        baseFan.position.set(0, 0, 0)

        // Update materials 
        this.game.materials.updateObject(baseFan)

        baseFan.removeFromParent()
        
        this.fans = {}
        this.fans.spawnerPosition = this.references.items.get('onlyFans')[0].position
        this.fans.count = 30
        this.fans.visibleCount = 0
        this.fans.currentIndex = 0
        this.fans.mass = 0.02
        this.fans.objects = []

        const references = []

        for(let i = 0; i < this.fans.count; i++)
        {
            // Reference
            const reference = new THREE.Object3D()

            reference.position.copy(this.fans.spawnerPosition)
            reference.position.y += 99
            reference.needsUpdate = true
            references.push(reference)
            
            // Object
            const object = this.game.objects.add(
                {
                    model: reference,
                    updateMaterials: false,
                    castShadow: false,
                    receiveShadow: false,
                    parent: null,
                },
                {
                    type: 'dynamic',
                    position: reference.position,
                    rotation: reference.quaternion,
                    friction: 0.7,
                    mass: this.fans.mass,
                    sleeping: true,
                    enabled: false,
                    colliders: [ { shape: 'cuboid', parameters: [ 0.45, 0.65, 0.45 ], category: 'object' } ],
                    waterGravityMultiplier: - 1
                },
            )

            this.fans.objects.push(object)
        }

        this.fans.instancedGroup = new InstancedGroup(references, baseFan)

        this.fans.pop = () =>
        {
            const object = this.fans.objects[this.fans.currentIndex]

            const spawnPosition = this.fans.spawnerPosition.clone()
            spawnPosition.x += (Math.random() - 0.5) * 4
            spawnPosition.y += 4 * Math.random()
            spawnPosition.z += (Math.random() - 0.5) * 4
            object.physical.body.setTranslation(spawnPosition)
            object.physical.body.setEnabled(true)
            object.physical.body.setLinvel({ x: 0, y: 0, z: 0 })
            object.physical.body.setAngvel({ x: 0, y: 0, z: 0 })
            object.physical.body.wakeUp()
            // this.game.ticker.wait(1, () =>
            // {
            //     object.physical.body.applyImpulse({
            //         x: (Math.random() - 0.5) * this.fans.mass * 2,
            //         y: Math.random() * this.fans.mass * 3,
            //         z: this.fans.mass * 7
            //     }, true)
            //     object.physical.body.applyTorqueImpulse({ x: 0, y: 0, z: 0 }, true)
            // })

            this.fans.currentIndex = (this.fans.currentIndex + 1) % this.fans.count

            this.fans.visibleCount = Math.min(this.fans.visibleCount + 1, this.fans.count)

            // Sound
            this.game.audio.groups.get('click').play(true)

            // Achievement
            this.game.achievements.setProgress('fan', 1)
        }
    }

    setOnlyFans()
    {
        const interactiveArea = this.game.interactivePoints.create(
            this.references.items.get('onlyFans')[0].position,
            'OnlyFans',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.fans.pop()
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )
    }

    setStatue()
    {
        this.statue = {}
        this.statue.body = this.references.items.get('statue')[0].userData.object.physical.body
        this.statue.down = false
    }

    setFWA()
    {
        this.fwa = {}

        // Confetti
        let i = 0
        this.fwa.positions = [
            new THREE.Vector3(23.5, 0, -18.5),
            new THREE.Vector3(27, 0, -19.5),
        ]
        const pop = () =>
        {
            i++
            const position = this.fwa.positions[i % this.fwa.positions.length]
            this.game.world.confetti.pop(position)
            
            setTimeout(pop, 500 + Math.random() * 1500)
        }
        setTimeout(pop, 2000)
        
        // Interactive points
        game.interactivePoints.temporaryHide()

        // Input => start
        this.game.inputs.addActions([
            { name: 'startFWA', categories: [ 'intro', 'modal', 'menu', 'racing', 'cinematic', 'wandering' ], keys: [ 'Keyboard.k' ] },
            { name: 'winFWA', categories: [ 'intro', 'modal', 'menu', 'racing', 'cinematic', 'wandering' ], keys: [ 'Keyboard.j' ] },
        ])
        this.game.inputs.events.on('startFWA', (action) =>
        {
            if(action.active)
            {
                // View
                game.view.zoom.baseRatio = 0.55
                game.view.zoom.ratio = 0.55
                game.view.zoom.smoothedRatio = 0.55
                game.view.focusPoint.position.set(25, 0, -19.2)
                game.view.focusPoint.isTracking = false
                window.setTimeout(() =>
                {
                    this.game.view.setMode(View.MODE_FIXED)
                }, 1000)

                // Weather
                this.game.weather.override.start(
                    {
                        humidity: 0,
                        electricField: 0,
                        clouds: 0,
                        wind: 0
                    },
                    0
                )
        
                // Day cycles
                this.game.dayCycles.override.start(
                    {
                        progress: 0.87
                    },
                    0
                )
                
                // Buttons
                document.querySelector('.js-menu-trigger').style.display = 'none'
                document.querySelector('.js-map-trigger').style.display = 'none'
            }
        })
        this.game.inputs.events.on('winFWA', (action) =>
        {
            if(action.active)
            {
                this.game.achievements.setProgress('foty', 1)
            }
        })
    }

    setAchievement()
    {
        this.events.on('boundingIn', () =>
        {
            this.game.achievements.setProgress('areas', 'social')
        })
    }

    update()
    {
        if(this.fans.visibleCount)
        {
            let allFansSleeping = true
            for(const fan of this.fans.objects)
                allFansSleeping = allFansSleeping && fan.physical.body.isSleeping()

            if(!allFansSleeping)
                this.fans.instancedGroup.updateBoundings()
        }
    
        if(this.statue && !this.statue.down && !this.statue.body.isSleeping())
        {
            const statueUp = new THREE.Vector3(0, 1, 0)
            statueUp.applyQuaternion(this.statue.body.rotation())
            if(statueUp.y < 0.25)
            {
                this.statue.down = true
                this.game.achievements.setProgress('statueDown', 1)
            }
        }

        for(const object of this.fans.objects)
        {
            if(!object.physical.body.isSleeping() && object.physical.body.isEnabled())
                object.visual.object3D.needsUpdate = true
        }
    }
}