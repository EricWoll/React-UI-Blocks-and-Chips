import { ShapeDef, ShapePreset } from '../types/gradient.types';
import {
    blobSVG,
    squiggleSvg,
    waveSvg,
    circleCutoutSvg,
    diagonalStripesSvg,
} from '../svgs/shapes.gradient.svgs';

function svgDataUri(svg: string) {
    // encode minimal for inline usage
    const encoded = encodeURIComponent(svg)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
    return `url("data:image/svg+xml,${encoded}")`;
}
svgDataUri.displayName = 'svgDataUri';

const SHAPES: Record<Exclude<ShapePreset, 'none'>, ShapeDef> = {
    blob: (() => {
        const url = svgDataUri(blobSVG);
        return {
            maskImage: url,
            webkitMaskImage: url,
            maskSize: 'contain',
            maskPosition: 'center',
            maskRepeat: 'no-repeat',
            webkitMaskSize: 'contain',
            webkitMaskPosition: 'center',
            webkitMaskRepeat: 'no-repeat',
        };
    })(),
    squiggle: (() => {
        // Thick squiggle stroke as the only visible area

        const url = svgDataUri(squiggleSvg);
        return {
            maskImage: url,
            webkitMaskImage: url,
            maskSize: 'cover',
            maskPosition: 'center',
            maskRepeat: 'no-repeat',
            webkitMaskSize: 'cover',
            webkitMaskPosition: 'center',
            webkitMaskRepeat: 'no-repeat',
        };
    })(),
    wave: (() => {
        const url = svgDataUri(waveSvg);
        return {
            maskImage: url,
            webkitMaskImage: url,
            maskSize: 'cover',
            maskPosition: 'center',
            maskRepeat: 'no-repeat',
            webkitMaskSize: 'cover',
            webkitMaskPosition: 'center',
            webkitMaskRepeat: 'no-repeat',
        };
    })(),
    circleCutout: (() => {
        // Center circle shows gradient, rest hidden (invert by swapping colors)
        const url = svgDataUri(circleCutoutSvg);
        return {
            maskImage: url,
            webkitMaskImage: url,
            maskSize: 'contain',
            maskPosition: 'center',
            maskRepeat: 'no-repeat',
            webkitMaskSize: 'contain',
            webkitMaskPosition: 'center',
            webkitMaskRepeat: 'no-repeat',
        };
    })(),
    diagonalStripes: (() => {
        // White stripes visible, black hidden
        const url = svgDataUri(diagonalStripesSvg);
        return {
            maskImage: url,
            webkitMaskImage: url,
            maskSize: 'auto 100%',
            maskPosition: 'center',
            maskRepeat: 'repeat',
            webkitMaskSize: 'auto 100%',
            webkitMaskPosition: 'center',
            webkitMaskRepeat: 'repeat',
        };
    })(),
};

export { svgDataUri, SHAPES };
