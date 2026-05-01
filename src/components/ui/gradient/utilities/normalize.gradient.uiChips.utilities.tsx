import {
    AnimatedGradientProps,
    ConcreteAnimation,
    AnimationName,
    BuiltInAnimationConfig,
    CustomAnimationConfig,
    ShapeAnimation,
    AnimationDescriptor,
} from '@/components/ui/gradient/types/gradient.uiChips.types';
import {
    buildPanKeyframes,
    buildHueKeyframes,
    buildPulseKeyframes,
    buildRotateKeyframes,
    buildBlobMorphKeyframes,
    buildSquiggleKeyframes,
} from '@/components/ui/gradient/utilities/animations.gradient.uiChips.utilities';
import {
    injectCSSOnce,
    uniqueName,
} from '@/components/ui/gradient/components/gradient.uiChips.components';

function normalizeAnimations(
    animations: AnimatedGradientProps['animations'],
    shapeAnim: AnimatedGradientProps['shapeAnim'],
    reduced: boolean,
): ConcreteAnimation[] {
    if (reduced) return [];

    const list: ConcreteAnimation[] = [];

    const addBuiltIn = (
        name: AnimationName,
        cfg: BuiltInAnimationConfig = {},
    ) => {
        let desc: AnimationDescriptor;
        switch (name) {
            case 'pan': {
                const dir = cfg.direction ?? 'diagonal';
                desc = buildPanKeyframes(dir);
                break;
            }
            case 'hue': {
                desc = buildHueKeyframes(cfg.intensity ?? 1);
                break;
            }
            case 'pulse': {
                desc = buildPulseKeyframes(cfg.intensity ?? 1);
                break;
            }
            case 'rotate': {
                const dir = (cfg.direction === 'ccw' ? 'ccw' : 'cw') as
                    | 'cw'
                    | 'ccw';
                desc = buildRotateKeyframes(dir);
                break;
            }
            case 'blobMorph': {
                desc = buildBlobMorphKeyframes(cfg.intensity ?? 1);
                break;
            }
            case 'squiggle': {
                desc = buildSquiggleKeyframes(cfg.intensity ?? 1);
                break;
            }
            default:
                return;
        }

        injectCSSOnce(desc.css, desc.name);

        const durationSec = cfg.speed ?? desc.defaultDuration;
        const easing = cfg.easing ?? desc.defaultEasing;
        const delaySec = cfg.delay ?? 0;
        const iter = cfg.iterationCount ?? 'infinite';
        const fill = cfg.fillMode ?? 'both';
        const dirPlay = cfg.playDirection ?? 'normal';
        const target = cfg.target ?? desc.defaultTarget;

        list.push({
            name: desc.name,
            durationMs: Math.max(50, durationSec * 1000),
            easing,
            iterationCount: iter,
            delayMs: Math.max(0, delaySec * 1000),
            fillMode: fill,
            playDirection: dirPlay,
            target,
        });
    };

    const addCustom = (cfg: CustomAnimationConfig) => {
        let keyName: string;

        if (typeof cfg.keyframes === 'string') {
            keyName = cfg.keyframes;
        } else {
            // Build and inject @keyframes from object
            const signature = JSON.stringify(cfg.keyframes);
            keyName = uniqueName('ag_custom', signature);

            const steps = Object.entries(cfg.keyframes)
                .map(([k, styles]) => {
                    const body = Object.entries(styles)
                        .map(([prop, val]) => `${prop}: ${String(val)};`)
                        .join(' ');
                    return `  ${k} { ${body} }`;
                })
                .join('\n');

            const css = `@keyframes ${keyName} {\n${steps}\n}`;
            injectCSSOnce(css, keyName);
        }

        const t = cfg.timing ?? {};
        list.push({
            name: keyName,
            durationMs: Math.max(50, t.duration ?? 4000),
            easing: t.easing ?? 'ease-in-out',
            iterationCount: t.iterationCount ?? 'infinite',
            delayMs: Math.max(0, t.delay ?? 0),
            fillMode: t.fillMode ?? 'both',
            playDirection: t.direction ?? 'normal',
            target: cfg.target ?? 'gradient',
            cssVars: cfg.cssVars,
        });
    };

    // Parse general animations
    if (Array.isArray(animations)) {
        animations.forEach((nm) => addBuiltIn(nm, {}));
    } else if (animations && typeof animations === 'object') {
        Object.values(animations).forEach((cfg) => {
            if ((cfg as CustomAnimationConfig).type === 'custom') {
                addCustom(cfg as CustomAnimationConfig);
            } else {
                const built = cfg as BuiltInAnimationConfig & {
                    type?: AnimationName;
                };
                const nm = (built.type as AnimationName) || (undefined as any);
                if (nm) addBuiltIn(nm, built);
            }
        });
    }

    // Parse shape-specific animations
    const addShapeAnim = (sAnim: ShapeAnimation) => {
        if (!sAnim) return;
        if (typeof sAnim === 'string') {
            addBuiltIn(sAnim as AnimationName, { target: 'shape' });
        } else if ((sAnim as CustomAnimationConfig).type === 'custom') {
            const sConfig = sAnim as CustomAnimationConfig;
            addCustom({ ...sConfig, target: sConfig.target ?? 'shape' });
        } else {
            const sBuiltIn = sAnim as BuiltInAnimationConfig & {
                type?: AnimationName;
            };
            const sName = (sBuiltIn.type as AnimationName) || 'blobMorph';
            addBuiltIn(sName, {
                ...sBuiltIn,
                target: sBuiltIn.target ?? 'shape',
            });
        }
    };

    if (Array.isArray(shapeAnim)) {
        shapeAnim.forEach(addShapeAnim);
    } else if (shapeAnim) {
        addShapeAnim(shapeAnim);
    }

    return list;
}
normalizeAnimations.displayName = 'normalizeAnimations';

/** Compose multiple animations into a single CSS animation string. */
function toAnimationCSS(anims: ConcreteAnimation[]): {
    animation: string;
    vars: Record<string, string | number>;
} {
    const chunks: string[] = [];
    const vars: Record<string, string | number> = {};
    anims.forEach((a) => {
        chunks.push(
            `${a.name} ${a.durationMs}ms ${a.easing} ${a.delayMs}ms ${a.playDirection} ${a.fillMode} ${a.iterationCount}`,
        );
        if (a.cssVars) Object.assign(vars, a.cssVars);
    });
    return { animation: chunks.join(', '), vars };
}
toAnimationCSS.displayName = 'toAnimationCSS';

export { normalizeAnimations, toAnimationCSS };
