import { Events } from '../Events.js'

export class MobileArrows
{
    constructor(game)
    {
        this.game = game
        this.events = new Events()
        this.active = false
        this.element = document.querySelector('.js-mobile-arrows')
        this.buttons = new Map()

        this.setItems()
    }

    setItems()
    {
        const arrowElements = this.element.querySelectorAll('.js-arrow')

        for(const arrow of arrowElements)
        {
            const action = arrow.dataset.action
            const item = {
                action,
                element: arrow,
                pressed: false
            }

            this.buttons.set(action, item)

            const start = (e) =>
            {
                e.preventDefault()
                e.stopPropagation()

                if(!item.pressed)
                {
                    item.pressed = true
                    this.game.inputs.start(`Mobile.${action}`)
                }
            }

            const end = (e) =>
            {
                e.preventDefault()
                e.stopPropagation()

                if(item.pressed)
                {
                    item.pressed = false
                    this.game.inputs.end(`Mobile.${action}`)
                }
            }

            arrow.addEventListener('touchstart', start, { passive: false })
            arrow.addEventListener('touchend', end, { passive: false })
            arrow.addEventListener('touchcancel', end, { passive: false })
            arrow.addEventListener('mousedown', start)
            arrow.addEventListener('mouseup', end)
            arrow.addEventListener('mouseleave', end)
        }
    }

    activate()
    {
        if(this.active)
            return

        this.active = true
        this.element.classList.add('is-active')
    }

    deactivate()
    {
        if(!this.active)
            return

        this.active = false
        this.element.classList.remove('is-active')

        // Release all pressed buttons
        for(const [action, item] of this.buttons)
        {
            if(item.pressed)
            {
                item.pressed = false
                this.game.inputs.end(`Mobile.${action}`)
            }
        }
    }
}
