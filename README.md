# Muhammed Rasal — Interactive 3D Portfolio

An interactive 3D game portfolio built with [Three.js](https://threejs.org/), powered by WebGPU/WebGL. Drive a car around a 3D world to discover projects, achievements, and secrets.

## Features

- 3D open world with vehicle physics (Rapier)
- Interactive areas: projects, achievements, bowling, circuit racing, altar, cookie, social, and more
- Dynamic day/night cycle and weather
- Multiplayer whispers (community message board)
- Circuit racing with leaderboard
- Touch, keyboard, and gamepad support
- Adaptive quality for low-end devices

## Tech Stack

- **Engine**: Three.js (TSL shaders, WebGPU/WebGL)
- **Physics**: Rapier 3D
- **Audio**: Howler.js
- **Animation**: GSAP
- **UI**: Tweakpane (debug), Stylus (CSS)
- **Build**: Vite 7

## Setup

```bash
npm install
npm run dev     # development
npm run build   # production build → dist/
npm run preview # preview production build
```

## Environment Variables

See `.env.example` for all options. Key vars:

| Variable | Description |
|---|---|
| `VITE_COMPRESSED` | Use compressed textures (KTX2) |
| `VITE_MUSIC` | Enable background music |
| `VITE_LOG` | Debug logging |
| `VITE_ANALYTICS_TAG` | Google Analytics ID |

## Deployment

Build outputs to `dist/`. Deploy to any static host (Netlify, Vercel, GitHub Pages).

**Netlify**: set publish dir to `dist`, build command `npm run build`, add environment variables from `.env.example` as needed.

## Credits

- Built on [Bruno Simon's Folio 2025](https://github.com/brunosimon/folio-2025) (MIT license)
- Music by [Kounine](https://linktr.ee/Kounine) (CC0 license)
- Physics by [Rapier](https://rapier.rs)

## License

MIT
