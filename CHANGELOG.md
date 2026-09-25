# What's New

## Driver Cockpit & HUD (2026-09-25)

### 3D Cockpit Interior
- Procedural cockpit attached to the chassis: dashboard, cluster binnacle, door panels, center console, shifter, A-pillars, rear-view mirror, windshield glass
- Animated steering wheel that follows your steering input
- Cockpit 3D group is only visible in Driver view so external cameras stay clean

### Cockpit HUD (Driver view only)
- Speedometer (km/h), RPM bar with redline state, live steering indicator
- Side buttons: BOOST, BRAKE, HONK, CAM (toggle camera), HEAD reset (recenter head + FOV)
- Buttons work with mouse + touch via pointer events

### Driver Head-Look
- Look around from the driver seat with hard head limits (~±83° yaw)
- Mouse drag to look, wheel to zoom FOV (38–82)
- Touch: 1–2 finger drag to look, pinch to zoom FOV
- Gamepad right stick head-look, keyboard I/K/J/L head-look with smooth velocity, U resets
- Eye sits in the cabin below the roof skin; near plane 0.05 in driver view, restored to 0.1 outside
- Fog pushed out (1.7x) and camera far extended (200 → 600) so the road ahead stays visible

## Mobile Driving Arrows
- On-screen arrow buttons (forward/left/right/backward) on touch devices in non-fixed camera modes (Forward, Directive, Driver)
- Nipple joystick auto-parks while arrows drive so there is no stuck input; arrows release cleanly on mode switch
- Touch controls doc updated: two-finger drag = orbit, pinch = zoom, arrow buttons = drive

## Labels & Input Fixes
- Interactive point labels now billboard (face the camera) at any angle
- Fixed touch pinch distance bug (`Math.sqrt(dx*dx, dy*dy)` → `Math.hypot(dx, dy)`)
- Two-finger drag now orbits the camera (like I/K/J/L) instead of panning the focus point; tracking re-enables on release

## Camera System Overhaul

### 4 Camera Views
- **Fixed** - Classic orbit camera behind the car. User-controlled angles with smooth keyboard/gamepad orbit (I/K/J/L keys, right stick).
- **Forward** - Always positioned behind the car, looking forward. Camera follows the vehicle's movement with smooth lerping.
- **Directive** - Smart camera that adapts to your driving direction. Shows the back of the car when going forward, flips to show the front when reversing. Remembers your last direction when you stop.
- **Driver** - Bonnet view. Camera sits on the hood looking forward, giving a first-person driving feel.

### Smooth Camera Orbit
- Replaced discrete keypress jumps with velocity-based continuous orbiting
- Smooth acceleration when holding I/K/J/L keys
- Exponential damping for buttery deceleration when releasing
- Frame-rate independent (delta time based)
- Configurable acceleration, damping, and max speed

### Camera Toggle Controls
| Device | Input |
|--------|-------|
| Keyboard | `V` |
| Touch | Three-finger tap |
| Gamepad | `Select + Start` / `Select + Options` |

### Options Menu
- New **Camera** toggle button in the Options menu
- Cycles through: Fixed → Forward → Directive → Driver
- Stays in sync with keyboard/touch/gamepad toggles

## Input Improvements

### Gamepad
- Added Select+Start combo for camera toggle
- Documented all button mappings in controls section

### Touch
- Added three-finger tap gesture for camera toggle
- Updated mobile/tablet controls documentation

### Keyboard
- V key now toggles camera view (works in all game modes, not just debug)
- Updated controls documentation with all new camera bindings

## UI Updates

### Controls Section
- **Mouse/Keyboard**: Added V key for camera toggle, I/K/J/L for orbit, U for reset
- **Mobile/Tablet**: Added three-finger tap for camera toggle
- **Gamepad**: Added Select+Start combo for camera toggle

### Options Menu
- Added Camera toggle button with current mode display
- Button shows current mode label (Fixed/Forward/Directive/Driver)

## Bug Fixes
- Fixed directive view showing wrong side when car stops (now remembers last direction)
- Removed unused CameraControls library dependency
- SocialArea cinematic now uses Fixed mode instead of removed Free mode
