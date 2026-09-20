import { Events } from '../Events.js'
import { Game } from '../Game.js'
import { Inputs } from './Inputs.js'

export class MobileArrows
{
    constructor()
    {
        this.game = Game.getInstance()
        this.events = new Events()

        this.element = document.querySelector('.js-mobile-arrows')

        if(!this.element)
            return

        this.arrowsElements = this.element.querySelectorAll('.js-arrow')

        this.setListeners()

        this.game.view.events.on('modeChange', () =>
        {
            this.updateVisibility()
        })

        this.game.inputs.events.on('modeChange', () =>
        {
            this.updateVisibility()
        })

        this.updateVisibility()
    }

    setListeners()
    {
        const directionMap = {
            up: 'forward',
            down: 'backward',
            left: 'left',
            right: 'right',
        }

        for(const arrowElement of this.arrowsElements)
        {
            const direction = arrowElement.dataset.direction
            const actionName = directionMap[direction]

            arrowElement.addEventListener('touchstart', (_event) =>
            {
                _event.preventDefault()
                _event.stopPropagation()
                this.game.inputs.start(actionName)
            }, { passive: false })

            arrowElement.addEventListener('touchend', (_event) =>
            {
                _event.preventDefault()
                _event.stopPropagation()
                this.game.inputs.end(actionName)
            }, { passive: false })

            arrowElement.addEventListener('touchcancel', (_event) =>
            {
                _event.preventDefault()
                _event.stopPropagation()
                this.game.inputs.end(actionName)
            }, { passive: false })
        }
    }

    updateVisibility()
    {
        const isTouch = this.game.inputs.mode === Inputs.MODE_TOUCH
        const isNonFixed = this.game.view && this.game.view.mode !== 1

        if(isTouch && isNonFixed)
            this.element.classList.add('is-active')
        else
            this.element.classList.remove('is-active')
    }
}
