import { render } from 'uhtml';
import { State } from '../state/State';
import { ReactiveRuntime } from '../state/ReactiveRuntime';

export type StateInit = Record<string, any>;

/**
 * Built-in reactive keys that every component exposes.
 * These keys never need to trigger a full render; instead we update
 * host attributes directly when they change.
 */
export interface BuiltInComponentState {
  /** If true, component is visually hidden (display:none). */
  hidden: boolean;
  /** If true, also applies aria-hidden + (optionally) inert for focus blocking. */
  hiddenInert?: boolean;

  /** If true, component should be considered disabled. */
  disabled: boolean;
  /** If true, also applies inert (so it can't be focused / interacted). */
  disabledInert?: boolean;
}

/**
 * Public configuration accepted by each component factory / constructor.
 * - top-level keys matching the reactive schema override that key
 * - top-level keys matching props become non-reactive props
 * - `state` allows callers to merge extra reactive keys in the component State
 */
export type ComponentConfig<Schema extends object, Props extends object> =
  Partial<Schema & BuiltInComponentState> &
  Partial<Props> & {
    id?: string;
    className?: string;
    state?: Record<string, any>;
  };

type ClassToken =
  | string
  | false
  | null
  | undefined
  | Iterable<ClassToken>;

/**
 * Base class for all Weave components.
 * - Owns a stable DOM host element (see `hostTag()`)
 * - Creates a reactive `State` composed of:
 *   - built-in component state (hidden/disabled/…)
 *   - subclass defaults via `stateInit`/`schema()`
 *   - user overrides (top-level config)
 *   - extra keys from `config.state`
 * - Provides lifecycle hooks (beforeMount / afterMount / beforeUnmount)
 * - Performs rendering via uhtml and re-renders when schema keys change
 */
export abstract class Component<
  Schema extends object = any,
  Props extends object = any
> {
  /** Reverse lookup: DOM host → component instance. */
  private static _byHost = new WeakMap<HTMLElement, Component>();

  /** Global incremental id sequence shared by all components. */
  private static _idSeq = 0;

  protected _state!: State<Record<string, any>> & Schema & BuiltInComponentState;
  protected _host!: HTMLElement;
  protected _parentState?: State<any>;
  protected _mounted = false;

  /** Config provided at construction time. */
  private readonly _incomingConfig: ComponentConfig<Schema, Props>;

  /** Non-reactive props resolved from the config. */
  protected props!: Props & { className?: string; id?: string };

  /** Component-wide unique id (overridable via config.id). */
  private readonly _id: string;

  /** Whether the generated id should be applied to the host element. */
  protected applyIdToHost = true;

  /** Classes currently managed by the component (diffed on every render). */
  private _managedHostClasses: Set<string> = new Set();

  /** Normalized `className` tokens provided via props (never mutated). */
  private _propClassNames: string[] = [];

  /** Subscriptions to state changes; we remove these on unmount. */
  private _unsubs: Array<() => void> = [];

  /** Microtask render scheduler flag. */
  private _renderQueued = false;

  /** Optional static schema; subclasses may override `schema()` instead. */
  protected stateInit?: StateInit;

  constructor(config: ComponentConfig<Schema, Props> = {} as ComponentConfig<Schema, Props>) {
    this._incomingConfig = config;
    this._id = this.resolveComponentId(config as Record<string, any>);
  }

  /** Normalized list of classes provided via the `className` prop. */
  protected propClassNames(): string[] {
    return [...this._propClassNames];
  }

  /** Utility to compose class tokens into a normalized Set. */
  protected hostClasses(...tokens: ClassToken[]): Set<string> {
    const out = new Set<string>();
    const push = (token: ClassToken): void => {
      if (!token) return;
      if (typeof token === 'string') {
        for (const part of token.split(/\s+/)) {
          if (part) out.add(part);
        }
        return;
      }
      if (typeof (token as any)[Symbol.iterator] === 'function') {
        for (const inner of token as Iterable<ClassToken>) push(inner);
      }
    };
    for (const token of tokens) push(token);
    return out;
  }

  /** Apply host classes diffing only the ones managed by the component. */
  protected syncHostClasses(
    classes: Iterable<string>,
    opts: { includePropClasses?: boolean } = {}
  ): void {
    const host = this._host;
    if (!host) return;

    const includePropClasses = opts.includePropClasses ?? true;
    const next = new Set<string>();

    for (const cls of classes) {
      const normalized = cls?.trim();
      if (!normalized) continue;
      next.add(normalized);
    }

    if (includePropClasses) {
      for (const cls of this._propClassNames) next.add(cls);
    }

    for (const cls of this._managedHostClasses) {
      if (!next.has(cls)) host.classList.remove(cls);
    }

    for (const cls of next) {
      if (!this._managedHostClasses.has(cls)) host.classList.add(cls);
    }

    this._managedHostClasses = next;
  }

  /**
   * Return the reactive schema for this component.
   * Includes built-in visibility and disabled keys so they're always available and bindable.
   */
  protected schema(): Record<string, any> {
    return {
      hidden: false,
      hiddenInert: false,
      disabled: false,
      disabledInert: false,
      ...(this.stateInit ?? {})
    };
  }

  /** Produce the component template. Keep it pure; no side effects here. */
  protected view(): any {
    return null;
  }

  /** Tag name for the host element. Override in leaf components (e.g., 'button'). */
  protected hostTag(): string {
    return 'div';
  }

  /** Lifecycle: before the initial render (state/props/host already created). */
  protected beforeMount(): void { /* no-op */ }

  /** Lifecycle: after the first render has committed to the DOM. */
  protected afterMount(): void { /* no-op */ }

  /** Lifecycle: right before removal from the DOM. */
  protected beforeUnmount(): void { /* no-op */ }

  /** Access the reactive state (typed with Schema + built-ins). */
  public state(): State<Record<string, any>> & Schema & BuiltInComponentState {
    return this._state;
  }

  /** Access the component host element. */
  public el(): HTMLElement {
    return this._host;
  }

  /** Access the generated component id. */
  public id(): string {
    return this._id;
  }

  /** Utility to derive a deterministic sub-id (e.g., `${id}-label`). */
  protected subId(suffix: string): string {
    return `${this._id}-${suffix}`;
  }

  /** Prefix for generated ids (override in subclasses). */
  protected idPrefix(): string {
    return 'cmp';
  }

  /** Whether the component has been mounted. */
  public isMounted(): boolean {
    return this._mounted;
  }

  /**
   * Mount the component into a container, optionally inheriting a parent State.
   * - creates a reactive State from the schema
   * - creates a host element (using `hostTag()`)
   * - attaches the host to the DOM
   * - wires lifecycle + subscriptions
   */
  public mount(
    target: Element | string,
    parent?: Component | State<any>
  ): this {
    if (this._mounted) return this;

    const container =
      typeof target === 'string'
        ? (document.querySelector(target) as HTMLElement | null)
        : (target as HTMLElement | null);
    if (!container) throw new Error('Mount target not found');

    if (parent instanceof Component) this._parentState = parent.state();
    else if (parent) this._parentState = parent;

    const baseSchema = this.schema();
    const { stateOverrides, props } = this.splitOptions(
      this._incomingConfig,
      baseSchema
    );
    this.props = props as Props & { className?: string; id?: string };
    this._propClassNames = Component.normalizeClassProp(this.props.className);

    const runtime: ReactiveRuntime | undefined = (this._parentState as any)?._runtime;
    const customExtra =
      this._incomingConfig && typeof this._incomingConfig.state === 'object'
        ? (this._incomingConfig.state ?? {})
        : {};
    const initial = {
      ...baseSchema,
      ...(customExtra ?? {}),
      ...stateOverrides
    } as Schema & BuiltInComponentState & Record<string, any>;

    this._state = new State(initial, this._parentState, runtime) as State<
      Record<string, any>
    > &
      Schema &
      BuiltInComponentState;

    this._host = document.createElement(this.hostTag());
    if (typeof this.props.className === 'string') {
      this._host.className = this.props.className;
    }
    if (this.applyIdToHost) {
      this._host.id = this._id;
    }

    this.beforeMount();

    for (const key of Object.keys(baseSchema)) {
      if (key === 'hidden' || key === 'hiddenInert') {
        this._unsubs.push(
          this._state.on(key, () => this.applyVisibility(), { immediate: false })
        );
      } else if (key === 'disabled' || key === 'disabledInert') {
        this._unsubs.push(
          this._state.on(key, () => this.applyDisabled(), { immediate: false })
        );
      } else {
        this._unsubs.push(
          this._state.on(key, () => this.requestRender(), { immediate: false })
        );
      }
    }

    container.appendChild(this._host);
    this.doRender();
    this.applyVisibility();
    this.applyDisabled();

    this._mounted = true;

    this.afterMount();

    Component._byHost.set(this._host, this);
    return this;
  }

  /**
   * Unmount the component, removing listeners and detaching the host from the DOM.
   */
  public unmount(): void {
    if (!this._mounted) return;

    this.beforeUnmount();

    for (const off of this._unsubs) off();
    this._unsubs = [];

    if (this._host.parentElement) {
      this._host.parentElement.removeChild(this._host);
    }
    Component._byHost.delete(this._host);

    this._mounted = false;
    this._managedHostClasses = new Set();
  }

  /** Find a component instance from a DOM node, if any. */
  public static fromElement(el: Element | null): Component | undefined {
    return el ? Component._byHost.get(el as HTMLElement) : undefined;
  }

  /**
   * Animate removal (using Tailwind/Flyon classes already present in CSS build)
   * and then unmount the component.
   */
  public requestRemove(opts: { timeoutMs?: number } = {}): void {
    const host = this._host;
    if (!host) return;

    host.classList.add('removing');
    host.classList.add('transition', 'duration-300', 'ease-in-out');

    const done = () => this.unmount();

    const total = this.getTransitionTotalMs(host);
    const safety = opts.timeoutMs ?? 350;
    let fired = false;

    const onEnd = (ev: Event) => {
      if (ev.target === host) {
        fired = true;
        host.removeEventListener('transitionend', onEnd);
        done();
      }
    };
    host.addEventListener('transitionend', onEnd);
    setTimeout(() => {
      if (!fired) {
        host.removeEventListener('transitionend', onEnd);
        done();
      }
    }, Math.max(total, safety));
  }

  /** Schedule a microtask re-render; coalesces multiple requests in the same tick. */
  protected requestRender(): void {
    if (this._renderQueued) return;
    this._renderQueued = true;
    queueMicrotask(() => {
      this._renderQueued = false;
      this.doRender();
      this.applyVisibility();
      this.applyDisabled();
    });
  }

  /** Perform the actual render into the host using uhtml. */
  protected doRender(): void {
    render(this._host, this.view());
  }

  /**
   * Apply visibility on the host without triggering a render.
   */
  protected applyVisibility(): void {
    const s = this.state();
    const host = this._host;
    if (!host) return;

    if (s.hidden) {
      host.style.display = 'none';
      host.setAttribute('aria-hidden', 'true');
      if (s.hiddenInert) {
        host.setAttribute('inert', '');
      }
    } else {
      host.style.display = '';
      host.removeAttribute('aria-hidden');
      if (!s.disabled && !s.disabledInert) {
        host.removeAttribute('inert');
      }
    }
  }

  /**
   * Apply disabled state on the host without triggering a render.
   */
  protected applyDisabled(): void {
    const s = this.state();
    const host = this._host;
    if (!host) return;

    if (s.disabled) {
      host.setAttribute('aria-disabled', 'true');
      if (s.disabledInert) {
        host.setAttribute('inert', '');
      }
    } else {
      host.removeAttribute('aria-disabled');
      if (!s.hidden && !s.hiddenInert) {
        host.removeAttribute('inert');
      }
    }
  }

  /**
   * Split raw options into reactive overrides (schema keys) vs plain props.
   */
  protected splitOptions(
    cfg: ComponentConfig<Schema, Props>,
    schema: Record<string, any>
  ): {
    stateOverrides: Partial<Schema & BuiltInComponentState>;
    props: Partial<Props> & { className?: string; id?: string };
  } {
    const schemaKeys = new Set(Object.keys(schema));
    const stateOverrides: Record<string, any> = {};
    const props: Record<string, any> = {};

    for (const [k, v] of Object.entries(cfg ?? {})) {
      if (k === 'state') continue;
      if (schemaKeys.has(k)) stateOverrides[k] = v;
      else props[k] = v;
    }

    return {
      stateOverrides: stateOverrides as Partial<Schema & BuiltInComponentState>,
      props: props as Partial<Props> & { className?: string; id?: string }
    };
  }

  /** Resolve the base component id, allowing overrides via `config.id`. */
  protected resolveComponentId(config: Record<string, any>): string {
    const incomingId = typeof config.id === 'string' ? config.id.trim() : '';
    if (incomingId) return incomingId;
    return Component.generateId(this.idPrefix());
  }

  private static generateId(prefix: string): string {
    const safe = prefix && prefix.trim().length ? prefix.trim() : 'cmp';
    const seq = ++Component._idSeq;
    return `${safe}-${seq}`;
  }

  private static normalizeClassProp(value: unknown): string[] {
    if (typeof value !== 'string') return [];
    return value
      .split(/\s+/)
      .map((cls) => cls.trim())
      .filter((cls) => cls.length > 0);
  }

  private getTransitionTotalMs(el: HTMLElement): number {
    const cs = getComputedStyle(el);
    const dur = cs.transitionDuration
      .split(',')
      .map((s) => s.trim())
      .map(this.parseTime);
    const del = cs.transitionDelay
      .split(',')
      .map((s) => s.trim())
      .map(this.parseTime);
    const pairs = dur.map((d, i) => d + (del[i] ?? 0));
    return pairs.length ? Math.max(...pairs) : 0;
  }

  private parseTime(s: string): number {
    return s.endsWith('ms')
      ? +s.slice(0, -2)
      : s.endsWith('s')
        ? +s.slice(0, -1) * 1000
        : 0;
  }
}
