import * as THREE from 'three/webgpu'
import { Game } from './Game.js'

export class CheatCode
{
    constructor()
    {
        this.game = Game.getInstance()
        this.visitCount = 0
        this.requiredVisits = 5
        this.activated = false
    }

    onAltarSacrifice()
    {
        if(this.activated)
            return

        this.visitCount++

        if(this.visitCount >= this.requiredVisits)
        {
            this.activated = true
            this.activate()
        }
    }

    activate()
    {
        // Complete all achievements
        this.game.achievements.groups.forEach((group) =>
        {
            if(group.progress instanceof Set)
            {
                const ids = Array.from({ length: 99 }, (_, i) => i)
                group.setProgress(ids, true)
            }
            else
            {
                group.setProgress(999999, true)
            }
        })

        this.game.achievements.storage.save()
        this.game.achievements.globalProgress.update()
        this.game.achievements.rewards.update()

        // Unlock all rewards (car skins)
        this.game.achievements.rewards.items.forEach((item) =>
        {
            item.locked = false
            item.element.classList.remove('is-locked')
            item.element.classList.remove('has-tooltip')
        })

        // Notification
        const html = /* html */`
            <div class="top">
                <div class="title">Cheat Activated!</div>
            </div>
            <div class="bottom">
                <div class="description">All achievements completed and all car skins unlocked!</div>
            </div>
        `
        this.game.notifications.show(html, 'achievement', 5)

        console.log('[CheatCode] All achievements completed and all car skins unlocked!')
    }
}
