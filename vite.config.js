import restart from 'vite-plugin-restart'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

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
            // Prevent rollup from externalizing buffer/process which are polyfilled
            plugins: []
        }
    },
    plugins:
    [
        wasm(),
        topLevelAwait(),
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