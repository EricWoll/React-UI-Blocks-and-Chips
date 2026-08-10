/* -------------------------------------------------------------------------- */
/* Public key constants                                                       */
/* -------------------------------------------------------------------------- */

export const Key = {
  Enter: "Enter",
  Escape: "Escape",
  Tab: "Tab",
  Backspace: "Backspace",
  Delete: "Delete",
  Insert: "Insert",

  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",

  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",

  CapsLock: "CapsLock",
  NumLock: "NumLock",
  ScrollLock: "ScrollLock",

  Pause: "Pause",
  PrintScreen: "PrintScreen",

  ContextMenu: "ContextMenu",

  Space: " ",

  F1: "F1",
  F2: "F2",
  F3: "F3",
  F4: "F4",
  F5: "F5",
  F6: "F6",
  F7: "F7",
  F8: "F8",
  F9: "F9",
  F10: "F10",
  F11: "F11",
  F12: "F12",
} as const;

export const Code = {
  Enter: "Enter",
  NumpadEnter: "NumpadEnter",
  Escape: "Escape",
  Tab: "Tab",
  Backspace: "Backspace",
  Delete: "Delete",
  Insert: "Insert",

  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",

  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",

  Space: "Space",

  MetaLeft: "MetaLeft",
  MetaRight: "MetaRight",
  ControlLeft: "ControlLeft",
  ControlRight: "ControlRight",
  AltLeft: "AltLeft",
  AltRight: "AltRight",
  ShiftLeft: "ShiftLeft",
  ShiftRight: "ShiftRight",
} as const;

/* -------------------------------------------------------------------------- */
/* Autocomplete-friendly string types                                         */
/* -------------------------------------------------------------------------- */

type LiteralString = string & Record<never, never>;

type Letter =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type Punctuation =
  | "`"
  | "-"
  | "="
  | "["
  | "]"
  | "\\"
  | ";"
  | "'"
  | ","
  | "."
  | "/"
  | "~"
  | "_"
  | "+"
  | "{"
  | "}"
  | "|"
  | ":"
  | '"'
  | "<"
  | ">"
  | "?"
  | "!";

type KnownKey = (typeof Key)[keyof typeof Key];

type KnownCode =
  | (typeof Code)[keyof typeof Code]
  | `Key${Uppercase<Letter>}`
  | `Digit${Digit}`
  | `Numpad${Digit}`
  | `F${Digit}`
  | `F1${"0" | "1" | "2"}`;

export type KeyboardKey =
  | KnownKey
  | Letter
  | Uppercase<Letter>
  | Digit
  | Punctuation
  | LiteralString;

export type KeyboardCode = KnownCode | LiteralString;

/* -------------------------------------------------------------------------- */
/* Public types                                                               */
/* -------------------------------------------------------------------------- */

export interface KeyboardErrorContext {
  event: KeyboardEvent;
  engine: KeyboardEngine;
  shortcutId: string;
  scope: string;
}

export type KeyboardErrorHandler = (
  error: unknown,
  context: KeyboardErrorContext,
) => void;

export type KeyboardTarget = Window | Document | HTMLElement | SVGElement;

export type ModifierMatch = "exact" | "at-least";

export type KeyboardPlatform = "mac" | "windows" | "linux" | "unknown";

export interface KeyChord {
  /**
   * Matches KeyboardEvent.key.
   *
   * Use this for logical shortcuts such as Ctrl+K, where the character matters.
   */
  key?: KeyboardKey;

  /**
   * Matches KeyboardEvent.code.
   *
   * Use this when physical keyboard position matters, such as game controls.
   */
  code?: KeyboardCode;

  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;

  /**
   * "exact":
   * Unspecified modifiers must not be pressed.
   *
   * "at-least":
   * Only explicitly declared modifiers are checked.
   *
   * Default: "exact"
   */
  modifiers?: ModifierMatch;
}

export interface ShortcutContext {
  event: KeyboardEvent;
  engine: KeyboardEngine;
  shortcutId: string;
  scope: string;
}

export type ShortcutHandler = (
  context: ShortcutContext,
) => void | boolean | Promise<void | boolean>;

export interface ShortcutDefinition {
  /**
   * Optional stable identifier. An identifier is generated when omitted.
   */
  id?: string;

  /**
   * One chord or an ordered sequence of chords.
   */
  chord: KeyChord | readonly KeyChord[];

  handler: ShortcutHandler;

  /**
   * Higher values are evaluated first.
   *
   * Default: 0
   */
  priority?: number;

  /**
   * Scope where this shortcut is active.
   *
   * Default: "global"
   */
  scope?: string;

  /**
   * Shortcut-specific activation condition.
   */
  when?: boolean | (() => boolean);

  /**
   * Controls whether the shortcut runs from inputs, textareas, selects,
   * content-editable elements, and textbox-like ARIA controls.
   *
   * Default: false
   */
  allowInEditable?: boolean;

  /**
   * Allow execution while KeyboardEvent.isComposing is true.
   *
   * Default: false
   */
  allowWhileComposing?: boolean;

  /**
   * Allow KeyboardEvent.key === "Dead".
   *
   * Default: false
   */
  allowDeadKey?: boolean;

  /**
   * Allow repeated keydown events generated while holding a key.
   *
   * Default: false
   */
  allowRepeat?: boolean;

  /**
   * Default: true
   */
  preventDefault?: boolean;

  /**
   * Default: false
   */
  stopPropagation?: boolean;

  /**
   * Also prevents other listeners on the same target from running.
   *
   * Default: false
   */
  stopImmediatePropagation?: boolean;

  /**
   * Stops lower-priority shortcuts after this one matches.
   *
   * Default: true
   */
  exclusive?: boolean;

  /**
   * Sequence timeout override for this shortcut.
   */
  sequenceTimeout?: number;

  /**
   * Optional AbortSignal for automatic removal.
   */
  signal?: AbortSignal;
}

export interface KeyboardEngineOptions {
  target?: KeyboardTarget;
  enabled?: boolean;
  capture?: boolean;
  mapCtrlToMetaOnMac?: boolean;
  sequenceTimeout?: number;
  defaultScope?: string;
  platform?: KeyboardPlatform;
  onError?: KeyboardErrorHandler;
}

export interface ShortcutRegistration {
  readonly id: string;
  unregister(): void;
}

export interface ShortcutGroupRegistration {
  readonly ids: readonly string[];
  unregister(): void;
}

/* -------------------------------------------------------------------------- */
/* Internal types                                                             */
/* -------------------------------------------------------------------------- */

interface CompiledShortcut {
  readonly id: string;
  readonly order: number;
  readonly definition: ShortcutDefinition;
  readonly chords: readonly KeyChord[];
  readonly scope: string;
  readonly priority: number;
  readonly sequenceTimeout: number;
}

interface SequenceState {
  step: number;
  expiresAt: number;
}

interface ShortcutBucket {
  readonly shortcuts: CompiledShortcut[];
}

const EMPTY_BUCKET: ShortcutBucket = {
  shortcuts: [],
};

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

let generatedId = 0;
let cachedPlatform: KeyboardPlatform | undefined;

function nextId(): string {
  generatedId += 1;
  return `keyboard-shortcut-${generatedId}`;
}

function detectPlatform(): KeyboardPlatform {
  if (cachedPlatform) {
    return cachedPlatform;
  }

  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const userAgentData = (
    navigator as Navigator & {
      userAgentData?: {
        platform?: string;
      };
    }
  ).userAgentData;

  const platformText = [
    userAgentData?.platform,
    navigator.platform,
    navigator.userAgent,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    platformText.includes("mac") ||
    platformText.includes("iphone") ||
    platformText.includes("ipad") ||
    platformText.includes("ipod")
  ) {
    cachedPlatform = "mac";
  } else if (platformText.includes("win")) {
    cachedPlatform = "windows";
  } else if (platformText.includes("linux") || platformText.includes("x11")) {
    cachedPlatform = "linux";
  } else {
    cachedPlatform = "unknown";
  }

  return cachedPlatform;
}

function isModifierKey(event: KeyboardEvent): boolean {
  return (
    event.key === "Alt" ||
    event.key === "AltGraph" ||
    event.key === "Control" ||
    event.key === "Meta" ||
    event.key === "Shift"
  );
}

function normalizeChords(
  chord: KeyChord | readonly KeyChord[],
): readonly KeyChord[] {
  const chords = Array.isArray(chord) ? chord : [chord];

  if (chords.length === 0) {
    throw new Error("A keyboard shortcut must contain at least one chord.");
  }

  for (const current of chords) {
    if (!current.key && !current.code) {
      throw new Error(
        "Each keyboard chord must declare at least a key or code.",
      );
    }
  }

  return chords;
}

function evaluateCondition(
  condition: boolean | (() => boolean) | undefined,
): boolean {
  if (condition === undefined) {
    return true;
  }

  return typeof condition === "function" ? condition() : condition;
}

function isTextEntryInput(element: HTMLInputElement): boolean {
  switch (element.type) {
    case "button":
    case "checkbox":
    case "color":
    case "file":
    case "hidden":
    case "image":
    case "radio":
    case "range":
    case "reset":
    case "submit":
      return false;

    default:
      return true;
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  let element = target instanceof Element ? target : null;

  while (element) {
    if (element instanceof HTMLInputElement) {
      if (isTextEntryInput(element)) {
        return true;
      }
    } else if (
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      return true;
    } else if (element instanceof HTMLElement) {
      if (element.isContentEditable) {
        return true;
      }

      const role = element.getAttribute("role");

      if (role === "textbox" || role === "searchbox" || role === "combobox") {
        return true;
      }
    }

    element = element.parentElement;
  }

  return false;
}

function matchesLogicalKey(actual: string, expected: string): boolean {
  if (actual.length === 1 && expected.length === 1) {
    return actual.toLocaleLowerCase() === expected.toLocaleLowerCase();
  }

  return actual === expected;
}

function matchesModifier(
  actual: boolean,
  expected: boolean | undefined,
  mode: ModifierMatch,
): boolean {
  if (expected !== undefined) {
    return actual === expected;
  }

  return mode === "at-least" || actual === false;
}

function matchesChord(
  event: KeyboardEvent,
  chord: KeyChord,
  platform: KeyboardPlatform,
  mapCtrlToMetaOnMac: boolean,
): boolean {
  if (chord.key !== undefined && !matchesLogicalKey(event.key, chord.key)) {
    return false;
  }

  if (chord.code !== undefined && event.code !== chord.code) {
    return false;
  }

  const modifierMode = chord.modifiers ?? "exact";

  const effectiveCtrl =
    platform === "mac" && mapCtrlToMetaOnMac ? event.metaKey : event.ctrlKey;

  return (
    matchesModifier(effectiveCtrl, chord.ctrl, modifierMode) &&
    matchesModifier(event.altKey, chord.alt, modifierMode) &&
    matchesModifier(event.shiftKey, chord.shift, modifierMode) &&
    matchesModifier(event.metaKey, chord.meta, modifierMode)
  );
}

function compareShortcuts(
  left: CompiledShortcut,
  right: CompiledShortcut,
): number {
  return right.priority - left.priority || left.order - right.order;
}

function reportAsyncError(
  result: void | boolean | Promise<void | boolean>,
  onError: (error: unknown) => void,
): void {
  if (result && typeof (result as PromiseLike<unknown>).then === "function") {
    void Promise.resolve(result).catch(onError);
  }
}

/* -------------------------------------------------------------------------- */
/* Keyboard engine                                                            */
/* -------------------------------------------------------------------------- */

export class KeyboardEngine {
  private readonly target: KeyboardTarget;
  private readonly capture: boolean;
  private readonly platform: KeyboardPlatform;
  private readonly mapCtrlToMetaOnMac: boolean;
  private readonly defaultSequenceTimeout: number;
  private readonly defaultScope: string;
  private readonly onError?: KeyboardEngineOptions["onError"];

  private enabled: boolean;
  private destroyed = false;
  private listening = false;
  private order = 0;

  private activeScopes: string[];
  private activeScopeSet: Set<string>;

  private readonly registrations = new Map<string, CompiledShortcut>();
  private readonly buckets = new Map<string, ShortcutBucket>();
  private readonly sequenceStates = new Map<string, SequenceState>();
  private readonly abortCleanups = new Map<string, () => void>();

  public constructor(options: KeyboardEngineOptions = {}) {
    const target =
      options.target ?? (typeof window !== "undefined" ? window : undefined);

    if (!target) {
      throw new Error("KeyboardEngine requires a target outside the browser.");
    }

    this.target = target;
    this.capture = options.capture ?? false;
    this.enabled = options.enabled ?? true;
    this.platform = options.platform ?? detectPlatform();
    this.mapCtrlToMetaOnMac = options.mapCtrlToMetaOnMac ?? true;
    this.defaultSequenceTimeout = options.sequenceTimeout ?? 750;
    this.defaultScope = options.defaultScope ?? "global";
    this.onError = options.onError;

    this.activeScopes = [this.defaultScope];
    this.activeScopeSet = new Set(this.activeScopes);

    this.start();
  }

  public start(): void {
    this.assertNotDestroyed();

    if (this.listening) {
      return;
    }

    this.target.addEventListener(
      "keydown",
      this.handleKeyDown as EventListener,
      { capture: this.capture },
    );

    this.listening = true;
  }

  public stop(): void {
    if (!this.listening) {
      return;
    }

    this.target.removeEventListener(
      "keydown",
      this.handleKeyDown as EventListener,
      { capture: this.capture },
    );

    this.listening = false;
    this.resetSequences();
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.stop();

    for (const cleanup of this.abortCleanups.values()) {
      cleanup();
    }

    this.abortCleanups.clear();
    this.registrations.clear();
    this.buckets.clear();
    this.sequenceStates.clear();

    this.destroyed = true;
  }

  public isDestroyed(): boolean {
    return this.destroyed;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.assertNotDestroyed();
    this.enabled = enabled;

    if (!enabled) {
      this.resetSequences();
    }
  }

  public getScopes(): readonly string[] {
    return this.activeScopes;
  }

  /**
   * Replaces the active scope stack.
   *
   * The last scope is considered the most recently activated scope and is
   * evaluated first. The default/global scope remains active automatically.
   */
  public setScopes(scopes: readonly string[]): void {
    this.assertNotDestroyed();

    const unique = new Set<string>([this.defaultScope]);

    for (const scope of scopes) {
      if (scope) {
        unique.add(scope);
      }
    }

    this.activeScopes = [...unique];
    this.activeScopeSet = unique;
    this.resetSequences();
  }

  public pushScope(scope: string): () => void {
    this.assertNotDestroyed();

    if (!scope) {
      throw new Error("A keyboard scope cannot be empty.");
    }

    const previousScopes = this.activeScopes;

    this.setScopes([...previousScopes, scope]);

    let removed = false;

    return () => {
      if (removed || this.destroyed) {
        return;
      }

      removed = true;

      const index = this.activeScopes.lastIndexOf(scope);

      if (index === -1) {
        return;
      }

      const next = this.activeScopes.slice();
      next.splice(index, 1);
      this.setScopes(next);
    };
  }

  public register(definition: ShortcutDefinition): ShortcutRegistration {
    this.assertNotDestroyed();

    if (definition.signal?.aborted) {
      return {
        id: definition.id ?? nextId(),
        unregister() {},
      };
    }

    const id = definition.id ?? nextId();

    if (this.registrations.has(id)) {
      throw new Error(
        `A keyboard shortcut with the id "${id}" is already registered.`,
      );
    }

    const scope = definition.scope ?? this.defaultScope;
    const chords = normalizeChords(definition.chord);

    const compiled: CompiledShortcut = {
      id,
      scope,
      chords,
      definition,
      priority: definition.priority ?? 0,
      sequenceTimeout:
        definition.sequenceTimeout ?? this.defaultSequenceTimeout,
      order: this.order++,
    };

    this.registrations.set(id, compiled);
    this.rebuildBucket(scope);

    let unregistered = false;

    const unregister = (): void => {
      if (unregistered) {
        return;
      }

      unregistered = true;
      this.unregister(id);
    };

    if (definition.signal) {
      const abortHandler = (): void => {
        unregister();
      };

      definition.signal.addEventListener("abort", abortHandler, {
        once: true,
      });

      this.abortCleanups.set(id, () => {
        definition.signal?.removeEventListener("abort", abortHandler);
      });
    }

    return {
      id,
      unregister,
    };
  }

  public registerMany(
    definitions: readonly ShortcutDefinition[],
  ): ShortcutGroupRegistration {
    this.assertNotDestroyed();

    const registrations: ShortcutRegistration[] = [];

    try {
      for (const definition of definitions) {
        registrations.push(this.register(definition));
      }
    } catch (error) {
      for (const registration of registrations) {
        registration.unregister();
      }

      throw error;
    }

    let unregistered = false;

    return {
      ids: registrations.map((registration) => registration.id),

      unregister(): void {
        if (unregistered) {
          return;
        }

        unregistered = true;

        for (const registration of registrations) {
          registration.unregister();
        }
      },
    };
  }

  public unregister(id: string): boolean {
    if (this.destroyed) {
      return false;
    }

    const shortcut = this.registrations.get(id);

    if (!shortcut) {
      return false;
    }

    this.abortCleanups.get(id)?.();
    this.abortCleanups.delete(id);

    this.registrations.delete(id);
    this.sequenceStates.delete(id);
    this.rebuildBucket(shortcut.scope);

    return true;
  }

  public resetSequences(): void {
    this.sequenceStates.clear();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.destroyed || !this.enabled || event.defaultPrevented) {
      return;
    }

    const now = performance.now();
    const editable = isEditableTarget(event.target);

    /*
     * Scope order is reversed so the most recently activated scope gets the
     * first chance to handle the event. Global remains available as fallback.
     */
    for (
      let scopeIndex = this.activeScopes.length - 1;
      scopeIndex >= 0;
      scopeIndex -= 1
    ) {
      const scope = this.activeScopes[scopeIndex];

      if (!this.activeScopeSet.has(scope)) {
        continue;
      }

      const bucket = this.buckets.get(scope) ?? EMPTY_BUCKET;

      for (const shortcut of bucket.shortcuts) {
        const matched = this.processShortcut(shortcut, event, editable, now);

        if (matched && (shortcut.definition.exclusive ?? true)) {
          return;
        }

        if (event.cancelBubble) {
          return;
        }
      }
    }
  };

  private processShortcut(
    shortcut: CompiledShortcut,
    event: KeyboardEvent,
    editable: boolean,
    now: number,
  ): boolean {
    const definition = shortcut.definition;

    if (!evaluateCondition(definition.when)) {
      this.sequenceStates.delete(shortcut.id);
      return false;
    }

    if (editable && !definition.allowInEditable) {
      this.sequenceStates.delete(shortcut.id);
      return false;
    }

    if (event.isComposing && !definition.allowWhileComposing) {
      return false;
    }

    if (event.key === "Dead" && !definition.allowDeadKey) {
      return false;
    }

    if (event.repeat && !definition.allowRepeat) {
      return false;
    }

    const sequenceState = this.sequenceStates.get(shortcut.id);

    let step =
      sequenceState && sequenceState.expiresAt >= now ? sequenceState.step : 0;

    const expectedChord = shortcut.chords[step];

    /*
     * Pressing a modifier produces its own keydown event.
     * Do not let that event reset an active sequence unless the shortcut
     * explicitly expects the modifier itself as the next key.
     */
    if (
      step > 0 &&
      isModifierKey(event) &&
      expectedChord?.key !== event.key &&
      expectedChord?.code !== event.code
    ) {
      return false;
    }

    if (
      expectedChord &&
      matchesChord(event, expectedChord, this.platform, this.mapCtrlToMetaOnMac)
    ) {
      step += 1;

      if (step === shortcut.chords.length) {
        this.sequenceStates.delete(shortcut.id);
        this.executeShortcut(shortcut, event);
        return true;
      }

      this.sequenceStates.set(shortcut.id, {
        step,
        expiresAt: now + shortcut.sequenceTimeout,
      });

      return false;
    }

    const firstChord = shortcut.chords[0];

    if (
      shortcut.chords.length > 1 &&
      firstChord &&
      matchesChord(event, firstChord, this.platform, this.mapCtrlToMetaOnMac)
    ) {
      this.sequenceStates.set(shortcut.id, {
        step: 1,
        expiresAt: now + shortcut.sequenceTimeout,
      });
    } else {
      this.sequenceStates.delete(shortcut.id);
    }

    return false;
  }

  private executeShortcut(
    shortcut: CompiledShortcut,
    event: KeyboardEvent,
  ): void {
    const definition = shortcut.definition;

    if (definition.preventDefault ?? true) {
      event.preventDefault();
    }

    if (definition.stopImmediatePropagation) {
      event.stopImmediatePropagation();
    } else if (definition.stopPropagation) {
      event.stopPropagation();
    }

    /*
     * Completing one sequence invalidates the partial state of every sequence.
     * This prevents stale progress from unexpectedly firing after a command.
     */
    this.resetSequences();

    const context: ShortcutContext = {
      event,
      engine: this,
      shortcutId: shortcut.id,
      scope: shortcut.scope,
    };

    try {
      const result = definition.handler(context);

      reportAsyncError(result, (error) => {
        this.reportError(error, context);
      });
    } catch (error) {
      this.reportError(error, context);
    }
  }

  private reportError(error: unknown, context: KeyboardErrorContext): void {
    if (this.onError) {
      this.onError(error, context);
      return;
    }

    console.error(`Keyboard shortcut "${context.shortcutId}" failed.`, error);
  }

  private rebuildBucket(scope: string): void {
    const shortcuts: CompiledShortcut[] = [];

    for (const shortcut of this.registrations.values()) {
      if (shortcut.scope === scope) {
        shortcuts.push(shortcut);
      }
    }

    if (shortcuts.length === 0) {
      this.buckets.delete(scope);
      return;
    }

    shortcuts.sort(compareShortcuts);

    this.buckets.set(scope, {
      shortcuts,
    });
  }

  private assertNotDestroyed(): void {
    if (this.destroyed) {
      throw new Error(
        "This KeyboardEngine instance has already been destroyed.",
      );
    }
  }
}
