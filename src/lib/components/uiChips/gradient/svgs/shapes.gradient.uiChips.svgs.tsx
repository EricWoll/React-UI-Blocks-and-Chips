/* ===================================================
                        Blob Mask
  =================================================== */

const blobSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="maskGrad" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="white"/>
      <stop offset="100%" stop-color="white"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="black"/>
  <path fill="white" d="M437.5,339Q411,378,381,420Q351,462,300.5,466.5Q250,471,210.5,439.5Q171,408,150,363Q129,318,132.5,263Q136,208,174,169Q212,130,267.5,114.5Q323,99,368.5,132Q414,165,438,208Q462,251,463,300Q464,349,437.5,339Z"/>
</svg>`;

/* ===================================================
                      Squiggle Mask
=================================================== */

const squiggleSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" preserveAspectRatio="none">
  <rect width="800" height="400" fill="black"/>
  <path d="M0,200 C100,100 200,300 300,200 C400,100 500,300 600,200 C700,100 800,300 900,200" 
        fill="none" stroke="white" stroke-width="120" stroke-linecap="round"/>
</svg>`;

/* ===================================================
                      Wave Mask
=================================================== */

const waveSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" preserveAspectRatio="none">
    <rect width="800" height="400" fill="black"/>
    <path d="M0,240 C120,180 200,280 320,220 C440,160 520,260 640,200 C760,140 840,240 960,180 L960,440 L0,440 Z" fill="white"/>
  </svg>`;

/* ===================================================
                      Circle Cutout Mask
=================================================== */

const circleCutoutSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet">
    <rect width="600" height="600" fill="black"/>
    <circle cx="300" cy="300" r="180" fill="white"/>
  </svg>`;

/* ===================================================
                      Diagonal Stripes Mask
=================================================== */

const diagonalStripesSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
    <rect width="200" height="200" fill="black"/>
    <g transform="rotate(45,100,100)">
      <rect x="-100" y="40" width="400" height="20" fill="white"/>
      <rect x="-100" y="80" width="400" height="20" fill="white"/>
      <rect x="-100" y="120" width="400" height="20" fill="white"/>
      <rect x="-100" y="160" width="400" height="20" fill="white"/>
    </g>
  </svg>`;

export { blobSVG, squiggleSvg, waveSvg, circleCutoutSvg, diagonalStripesSvg };
