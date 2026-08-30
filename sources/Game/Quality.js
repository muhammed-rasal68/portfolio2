import { Events } from './Events.js'
import { Game } from './Game.js'

export class Quality
{
    constructor()
    {
        this.game = Game.getInstance()

        this.events = new Events()

        this.detectSpecs()
        this.fpsAdjusted = false

        setTimeout(() => this.startFPSMonitor(), 5000)

        this.debug()
    }

    detectSpecs()
    {
        let score = 0

        // RAM
        this.deviceMemory = navigator.deviceMemory || 4
        if(this.deviceMemory >= 16) score += 3
        else if(this.deviceMemory >= 8) score += 2
        else if(this.deviceMemory >= 4) score += 1
        else score -= 1

        // CPU cores
        this.hardwareConcurrency = navigator.hardwareConcurrency || 4
        if(this.hardwareConcurrency >= 16) score += 2
        else if(this.hardwareConcurrency >= 8) score += 1
        else if(this.hardwareConcurrency < 4) score -= 1

        // GPU via WebGL
        this.gpuVendor = ''
        this.gpuRenderer = ''
        try
        {
            const canvas = document.createElement('canvas')
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
            if(gl)
            {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
                if(debugInfo)
                {
                    this.gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || ''
                    this.gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || ''
                }
            }
        }
        catch(e)
        {
            // WebGL not available
        }

        const gpuStr = (this.gpuVendor + ' ' + this.gpuRenderer).toLowerCase()
        const isLowEndGPU = /intel (hd|uhd|gma)|mali|powervr|adreno (3|4|5)\d|lumos|vivante|tegra (3|4)|swiftshader|llvmpipe/.test(gpuStr)
        const isIntegratedIntel = /intel/.test(gpuStr) && /(hd|uhd|iris)$/.test(gpuStr)

        if(isLowEndGPU) score -= 4
        else if(isIntegratedIntel && this.deviceMemory < 8) score -= 2

        // Screen resolution
        this.screenResolution = window.screen.width * window.screen.height
        if(this.screenResolution >= 8294400) score -= 3
        else if(this.screenResolution > 3686400) score -= 1
        else if(this.screenResolution > 2073600) score += 0
        else if(this.screenResolution > 1228800) score += 1
        else score += 2

        // Pixel ratio
        this.pixelRatio = window.devicePixelRatio || 1
        if(this.pixelRatio > 2) score -= 2
        else if(this.pixelRatio > 1.5) score -= 1

        // WebGPU detection
        this.hasWebGPU = typeof navigator.gpu !== 'undefined'
        if(this.hasWebGPU) score += 1

        // Mobile detection
        this.isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        if(this.isMobile) score -= 3

        // Touch screen (tablet indicator)
        this.isTouch = 'ontouchstart' in window && navigator.maxTouchPoints > 1
        if(this.isTouch && !this.isMobile) score -= 1

        // Connection type
        this.connectionType = 'unknown'
        if('connection' in navigator)
        {
            const conn = navigator.connection
            this.connectionType = conn.effectiveType || 'unknown'
            if(conn.saveData) score -= 1
            if(conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') score -= 1
        }

        // Map score to level (0=high, 3=low), biased toward lower quality
        if(score >= 6) this.level = 0
        else if(score >= 3) this.level = 1
        else if(score >= 0) this.level = 2
        else this.level = 3
    }

    startFPSMonitor()
    {
        if(!this.game.ticker)
            return

        this.fpsFrames = []
        this.fpsMonitoring = true
        this.fpsAdjusted = false

        this.game.ticker.events.on('tick', () =>
        {
            if(!this.fpsMonitoring || this.fpsAdjusted)
                return

            this.fpsFrames.push(performance.now())
            if(this.fpsFrames.length > 30)
                this.fpsFrames.shift()

            if(this.fpsFrames.length === 30)
            {
                const elapsed = this.fpsFrames[29] - this.fpsFrames[0]
                const avgFPS = 30000 / elapsed

                if(avgFPS < 15 && this.level < 3)
                    this.changeLevel(3)
                else if(avgFPS < 24 && this.level < 2)
                    this.changeLevel(this.level + 1)
                else if(avgFPS < 30 && this.level < 1)
                    this.changeLevel(this.level + 1)

                this.fpsAdjusted = true
                this.fpsMonitoring = false
            }
        }, 0)
    }

    changeLevel(level = 0)
    {
        level = Math.max(0, Math.min(3, level))

        if(level === this.level)
            return

        this.level = level
        this.events.trigger('change', [ this.level ])
    }

    debug()
    {
        if(this.game.debug.active)
        {
            const debugPanel = this.game.debug.panel.addFolder({
                title: '⚙️ Quality',
                expanded: false,
            })

            debugPanel.addBinding(this, 'level', { label: 'Level', min: 0, max: 3, step: 1 })
                .on('change', (evt) => this.changeLevel(evt.value))

            this.game.debug.addButtons(
                debugPanel,
                {
                    'Very Low': () => this.changeLevel(3),
                    'Low': () => this.changeLevel(2),
                    'Medium': () => this.changeLevel(1),
                    'High': () => this.changeLevel(0),
                },
                'change'
            )

            debugPanel.addMonitor(this, 'deviceMemory', { label: 'RAM (GB)' })
            debugPanel.addMonitor(this, 'hardwareConcurrency', { label: 'CPU Cores' })
            debugPanel.addMonitor(this, 'screenResolution', { label: 'Screen Pixels' })
            debugPanel.addMonitor(this, 'pixelRatio', { label: 'Pixel Ratio' })
            debugPanel.addMonitor(this, 'gpuRenderer', { label: 'GPU', view: 'text', interval: 0 })
            debugPanel.addMonitor(this, 'hasWebGPU', { label: 'WebGPU' })
            debugPanel.addMonitor(this, 'isMobile', { label: 'Mobile' })
            debugPanel.addMonitor(this, 'connectionType', { label: 'Connection' })
        }
    }
}