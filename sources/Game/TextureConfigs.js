import * as THREE from 'three/webgpu'

// Texture configuration presets to reduce redundant code
export const TextureConfigs = {
    // Simple nearest filter (pixelated)
    nearest: (texture) =>
    {
        texture.minFilter = THREE.NearestFilter
        texture.magFilter = THREE.NearestFilter
        texture.generateMipmaps = false
    },

    // Linear filter (smooth)
    linear: (texture) =>
    {
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.generateMipmaps = false
    },

    // With sRGB color space
    sRGB: (texture) =>
    {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.minFilter = THREE.NearestFilter
        texture.magFilter = THREE.NearestFilter
        texture.generateMipmaps = false
    },

    // Repeating texture
    repeat: (texture) =>
    {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.generateMipmaps = false
    },

    // Clamp to edge (no repeat)
    clampLinear: (texture) =>
    {
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.generateMipmaps = false
        texture.wrapS = THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping
    },

    // Clamp with sRGB
    clampSRGB: (texture) =>
    {
        texture.minFilter = THREE.NearestFilter
        texture.magFilter = THREE.NearestFilter
        texture.generateMipmaps = false
        texture.wrapS = THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping
        texture.colorSpace = THREE.SRGBColorSpace
    },

    // Flip Y + no mipmaps (for terrain)
    terrain: (texture) =>
    {
        texture.flipY = false
    },

    // Half repeat scale
    halfRepeat: (texture) =>
    {
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.generateMipmaps = false
        texture.repeat.x = 0.5
    }
}
