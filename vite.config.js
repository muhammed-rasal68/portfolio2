import 'dotenv/config'
import restart from 'vite-plugin-restart'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Lightweight polyfills for browser build
// `process` and `buffer` are required by some three.js loaders (zstd, ktx)
// We'll add aliases and esbuild options below to ensure Vite resolves them.

export default {
    root: 'sources/', // Sources files (typically where index.html is)
    envDir: '../',  // Directory where the env file is located
    publicDir: '../static/', // Path from "root" to static assets (files that are served as they are)
    base: './', // Public path (what's after the domain)
    server:
    {
        // https: true,
        host: true, // Open to local network and display URL
        open: true // Open in browser
    },
    build:
    {
        outDir: '../dist', // Output in the dist/ folder
        emptyOutDir: true, // Empty the folder first
        sourcemap: false // Add sourcemap
    },
    plugins:
    [
        wasm(),
        topLevelAwait(),
        restart({ restart: [ '../static/**', ] }), // Restart server on static file change
        nodePolyfills(),
        // basicSsl()
    ]

    ,
    resolve:
    {
        alias:
        {
            // map node shims to browser-friendly packages
            process: 'process/browser',
            buffer: 'buffer'
        }
    },

    optimizeDeps:
    {
        esbuildOptions:
        {
            define: { global: 'globalThis' }
        }
    }

    ,
    // Ensure these node-shim packages are pre-bundled so esbuild doesn't try to
    // inject virtual paths that Vite can't mark external.
    optimizeDeps:
    {
        include: [ 'buffer', 'process', '@esbuild-plugins/node-globals-polyfill' ],
        esbuildOptions:
        {
            define: { global: 'globalThis' }
        }
    },

    // Prevent SSR bundler from externalizing the polyfill plugin which causes
    // resolution issues in dev dependency scanning.
    ssr:
    {
        noExternal: [ '@esbuild-plugins/node-globals-polyfill' ]
    }
}