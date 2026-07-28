import restart from 'vite-plugin-restart'
import wasm from 'vite-plugin-wasm'

export default {
    root: 'sources/',
    envDir: '../',
    publicDir: '../static/',
    base: './',
    server:
    {
        host: true,
        open: true
    },
    build:
    {
        outDir: '../dist',
        emptyOutDir: true,
        sourcemap: false,
        rollupOptions:
        {
            output:
            {
                manualChunks:
                {
                    three: [ 'three' ],
                    rapier: [ '@dimforge/rapier3d' ],
                    vendor: [ 'gsap', 'howler', 'tweakpane' ],
                }
            }
        }
    },
    plugins:
    [
        wasm(),
        restart({ restart: [ '../static/**' ] }),
    ],
    resolve:
    {
        alias:
        {
            process: 'process/browser',
            buffer: 'buffer'
        }
    },
    define:
    {
        global: 'globalThis'
    }
}