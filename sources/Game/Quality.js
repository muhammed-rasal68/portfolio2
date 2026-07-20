import { Events } from './Events.js'
import { Game } from './Game.js'

export class Quality
{
    constructor()
    {
        this.game = Game.getInstance()

        this.events = new Events()

        // Detect device RAM
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        const deviceMemory = navigator.deviceMemory || 4 // Default 4GB
        const isLowEnd = deviceMemory <= 2 || (isMobile && deviceMemory <= 3)
        const isHighEnd = deviceMemory >= 8

        // Set quality level based on RAM and device
        // 0 = highest quality (8GB+), 1 = medium (3-7GB), 2 = low (2GB), 3 = very low (<2GB)
        if(isHighEnd)
            this.level = 0
        else if(isLowEnd && deviceMemory < 2)
            this.level = 3 // Aggressive optimization
        else if(isLowEnd)
            this.level = 2 // Moderate optimization
        else if(isMobile)
            this.level = 1
        else
            this.level = 0

        this.isLowEnd = isLowEnd
        this.isHighEnd = isHighEnd
        this.deviceMemory = deviceMemory

        // Debug
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
        }
    }

    changeLevel(level = 0)
    {
        // Clamp level
        level = Math.max(0, Math.min(3, level))
        
        // Same
        if(level === this.level)
            return
            
        this.level = level
        this.events.trigger('change', [ this.level ])
    }
}