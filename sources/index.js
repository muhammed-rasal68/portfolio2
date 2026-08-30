import './buffer-setup.js'
import './threejs-override.js'
import { Game } from './Game/Game.js'
import consoleLog from './data/consoleLog.js'

if(import.meta.env.VITE_LOG)
    console.log(
        ...consoleLog
    )

window.addEventListener('error', (e) => {
    console.error('[FATAL ERROR]', e.message, e.filename, e.lineno, e.error)
})

window.addEventListener('unhandledrejection', (e) => {
    console.error('[UNHANDLED REJECTION]', e.reason)
})

try {
    if(import.meta.env.VITE_GAME_PUBLIC)
        window.game = new Game()
    else
        new Game()
} catch(e) {
    console.error('[GAME INIT ERROR]', e)
}