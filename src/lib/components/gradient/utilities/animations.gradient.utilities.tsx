import {
    AnimationDescriptor,
    BuiltInAnimationConfig,
} from '../types/gradient.types';
import { uniqueName } from '../components/gradient.components';

// Moves gradient around
function buildPanKeyframes(
    direction: NonNullable<BuiltInAnimationConfig['direction']> = 'diagonal',
): AnimationDescriptor {
    const keyName = uniqueName('ag_pan', direction);
    let from = '0% 50%',
        mid = '100% 50%';
    if (direction === 'vertical') {
        from = '50% 0%';
        mid = '50% 100%';
    }
    if (direction === 'horizontal') {
        from = '0% 50%';
        mid = '100% 50%';
    }
    if (direction === 'diagonal') {
        from = '0% 0%';
        mid = '100% 100%';
    }
    const css = `
@keyframes ${keyName} {
  0%   { background-position: ${from}; }
  50%  { background-position: ${mid}; }
  100% { background-position: ${from}; }
}`;
    return {
        name: keyName,
        css,
        defaultDuration: 10,
        defaultEasing: 'ease-in-out',
        affects: ['backgroundPosition'],
        defaultTarget: 'gradient',
    };
}
buildPanKeyframes.displayName = 'buildPanKeyframes';

function buildHueKeyframes(intensity = 1): AnimationDescriptor {
    const deg = Math.round(360 * Math.max(0.2, intensity));
    const keyName = uniqueName('ag_hue', String(deg));
    const css = `
@keyframes ${keyName} {
  0%   { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(${deg}deg); }
}`;
    return {
        name: keyName,
        css,
        defaultDuration: 12,
        defaultEasing: 'linear',
        affects: ['filter'],
        defaultTarget: 'gradient',
    };
}
buildHueKeyframes.displayName = 'buildHueKeyframes';

// Changes size
function buildPulseKeyframes(intensity = 1): AnimationDescriptor {
    const scale = 1 + Math.min(0.06, 0.02 * intensity);
    const keyName = uniqueName('ag_pulse', String(scale));
    const css = `
@keyframes ${keyName} {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(${scale.toFixed(3)}); }
}`;
    return {
        name: keyName,
        css,
        defaultDuration: 6,
        defaultEasing: 'ease-in-out',
        affects: ['transform'],
        defaultTarget: 'wrapper',
    };
}
buildPulseKeyframes.displayName = 'buildPulseKeyframes';

function buildRotateKeyframes(
    direction: 'cw' | 'ccw' = 'cw',
): AnimationDescriptor {
    const keyName = uniqueName('ag_rotate', direction);
    const to = direction === 'ccw' ? '-360deg' : '360deg';
    const css = `
@keyframes ${keyName} {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(${to}); }
}`;
    return {
        name: keyName,
        css,
        defaultDuration: 40,
        defaultEasing: 'linear',
        affects: ['transform'],
        defaultTarget: 'wrapper',
    };
}
buildRotateKeyframes.displayName = 'buildRotateKeyframes';

// Slight Pulse and Hue Shift
function buildBlobMorphKeyframes(intensity = 1): AnimationDescriptor {
    // Approximate blob morph with border-radius / transform tweaks (applies best on SHAPE layer)
    const k = Math.min(20, 6 * intensity);
    const keyName = uniqueName('ag_blob', String(k));
    const css = `
@keyframes ${keyName} {
  0%   { border-radius: 40% 60% 55% 45% / 45% 40% 60% 55%; transform: rotate(0deg) scale(1); }
  25%  { border-radius: 50% 50% 45% 55% / 55% 45% 55% 45%; transform: rotate(${k}deg) scale(1.02); }
  50%  { border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%; transform: rotate(0deg) scale(1.04); }
  75%  { border-radius: 45% 55% 60% 40% / 40% 55% 45% 60%; transform: rotate(-${k}deg) scale(1.02); }
  100% { border-radius: 40% 60% 55% 45% / 45% 40% 60% 55%; transform: rotate(0deg) scale(1); }
}`;
    return {
        name: keyName,
        css,
        defaultDuration: 18,
        defaultEasing: 'ease-in-out',
        affects: ['transform'],
        defaultTarget: 'shape',
    };
}
buildBlobMorphKeyframes.displayName = 'buildBlobMorphKeyframes';

function buildSquiggleKeyframes(intensity = 1): AnimationDescriptor {
    // Oscillate mask position to simulate wave motion on squiggle shape
    const amp = Math.min(40, 12 * intensity);
    const keyName = uniqueName('ag_squiggle', String(amp));
    const css = `
@keyframes ${keyName} {
  0%   { -webkit-mask-position: 50% 50%; mask-position: 50% 50%; }
  50%  { -webkit-mask-position: calc(50% + ${amp}px) 50%; mask-position: calc(50% + ${amp}px) 50%; }
  100% { -webkit-mask-position: 50% 50%; mask-position: 50% 50%; }
}`;
    return {
        name: keyName,
        css,
        defaultDuration: 8,
        defaultEasing: 'ease-in-out',
        affects: ['maskPosition'],
        defaultTarget: 'shape',
    };
}
buildSquiggleKeyframes.displayName = 'buildSquiggleKeyframes';

export {
    buildPanKeyframes,
    buildHueKeyframes,
    buildPulseKeyframes,
    buildRotateKeyframes,
    buildBlobMorphKeyframes,
    buildSquiggleKeyframes,
};
