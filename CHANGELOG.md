# What's New

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
