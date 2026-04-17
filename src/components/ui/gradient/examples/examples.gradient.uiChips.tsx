//   ——— USAGE EXAMPLES (for your reference) ———

// 1) HEX → auto gradient (pan)
/*
<AnimatedGradient
  colorHex="#4f46e5"
  animations={['pan']}
  className="rounded-2xl p-6"
/>
*/

// 2) Custom gradient override + multiple animations
/*
<AnimatedGradient
  gradient="linear-gradient(135deg, #34d399, #3b82f6, #a78bfa)"
  animations={{
    pan: { type: 'pan', speed: 10, direction: 'diagonal' },
    hue: { type: 'hue', speed: 14, intensity: 0.8 },
  }}
  className="rounded-3xl aspect-[3/1]"
/>
*/

// 3) Blob shape + morph + children
/*
<AnimatedGradient
  colorHex="#10b981"
  shape="blob"
  shapeAnim={['blobMorph']}
  animations={['pan']}
  className="rounded-xl p-8"
>
  <h2 className="text-white font-semibold">Blob Energy</h2>
</AnimatedGradient>
*/

// 4) Custom shape (SVG mask) + custom animation
/*
<AnimatedGradient
  colorHex="#f97316"
  shape={{
    type: 'custom',
    mask: 'url(#myMask)' // or data URI
  }}
  animations={{
    defaultPan: { type: 'pan', speed: 12 },
    customWiggle: {
      type: 'custom',
      target: 'shape',
      keyframes: {
        '0%':   { transform: 'translateX(0px)' },
        '50%':  { transform: 'translateX(12px)' },
        '100%': { transform: 'translateX(0px)' },
      },
      timing: { duration: 5000, iterationCount: 'infinite', easing: 'ease-in-out' },
      cssVars: { '--wiggle-amp': '12px' }
    }
  }}
  className="rounded-2xl"
/>
*/

// 5) Respect motion sensitivity (default true)
/*
<AnimatedGradient
  colorHex="#06b6d4"
  animations={['pan','hue']}
  respectReducedMotion={true}
  className="rounded-lg"
/>
*/
