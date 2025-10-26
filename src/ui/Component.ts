import { render } from 'uhtml';
import { State } from '../state/State';
import { ReactiveRuntime } from '../state/ReactiveRuntime';

export interface BuiltInComponentState {
  /** If true, the host is visually hidden (display:none) */
  hidden: boolean;
  /** If true, hidden hosts are also taken out of the a11y tree via inert/aria-hidden */
  hiddenInert: boolean;
}

export type ComponentConfig<
  S extends BuiltInComponentState = BuiltInComponentState,
  Props extends Record<string, any> = Record<string, any>
> = Partial<S> &
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
 *   - built-in component state (hidden/…)
 *   - subclass defaults via `initialState()`
 *   - user overrides (top-level config)
 *   - extra keys from `config.state`
 * - Provides lifecycle hooks (beforeMount / afterMount / beforeUnmount)
 * - Performs rendering via uhtml and re-renders when schema keys change
 */
export abstract class Component<
  S extends BuiltInComponentState = BuiltInComponentState
> {
  /** Reverse lookup: DOM host → component instance. */
  private static _byHost = new WeakMap<HTMLElement, Component>();

  /** Global incremental id sequence shared by all components. */
  private static _idSeq = 0;

  protected _state!: State & S;
  protected _host!: HTMLElement;
  protected _mounted = false;
  protected _parentState?: State;

  protected props: Record<string, any> = {};

  protected _unsubs: Array<() => void> = [];
  protected _renderQueued = false;

  private readonly _incomingProps: ComponentConfig<S, any>;

  /** Component-wide unique id (overridable via config.id). */
  private readonly _id: string;

  /** Whether the generated id should be applied to the host element. */
  protected applyIdToHost = true;

  /** Classes currently managed by the component (diffed on every render). */
  private _managedHostClasses: Set<string> = new Set();

  /** Normalized `className` tokens provided via props (never mutated). */
  protected _propClassNames: string[] = [];

  constructor(config: ComponentConfig<S, any> = {} as ComponentConfig<S, any>) {
    this._incomingProps = config;
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
   * Returns the initial reactive state for this component.
   * Subclasses must call `super.initialState()` and merge their own defaults.
   */
  protected initialState(): S {
    return {
      hidden: false,
      hiddenInert: false
    } as S;
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
  protected beforeMount(): void {
    /* no-op */
  }

  /** Lifecycle: after the first render has committed to the DOM. */
  protected afterMount(): void {
    /* no-op */
  }

  /** Lifecycle: right before removal from the DOM. */
  protected beforeUnmount(): void {
    /* no-op */
  }

  /** Access the reactive state (typed with Schema + built-ins). */
  public state(): State & S {
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
   * - creates a reactive State from the initial state
   * - creates a host element (using `hostTag()`)
   * - attaches the host to the DOM
   * - wires lifecycle + subscriptions
   */
  public mount(target: Element | string, parent?: Component | State<any>): this {
    if (this._mounted) return this;

    const container =
      typeof target === 'string'
        ? (document.querySelector(target) as HTMLElement | null)
        : (target as HTMLElement | null);
    if (!container) throw new Error('Mount target not found');

    if (parent instanceof Component) {
      this._parentState = parent.state();
    } else if (parent instanceof State) {
      this._parentState = parent;
    } else {
      this._parentState = undefined;
    }

    const base = this.initialState();
    const { stateOverrides, props } = this.splitOptions(this._incomingProps, base);
    this.props = props;
    this._propClassNames = Component.normalizeClassProp(this.props.className);

    const runtime: ReactiveRuntime | undefined = (this._parentState as any)?._runtime;
    const extraState =
      this._incomingProps && typeof this._incomingProps.state === 'object'
        ? this._incomingProps.state ?? {}
        : {};

    const parentState = this._parentState;

    this._state = new State(
      {
        ...base,
        ...(extraState ?? {}),
        ...(stateOverrides as Record<string, any>)
      },
      parentState,
      runtime
    ) as State & S;

    this._host = document.createElement(this.hostTag());
    if (typeof this.props.className === 'string') {
      this._host.className = this.props.className;
    }
    if (this.applyIdToHost) {
      this._host.id = this._id;
    }

    this.beforeMount();

    const watchedKeys = new Set<string>([
      ...Object.keys(base ?? {}),
      ...Object.keys(extraState ?? {})
    ]);

    for (const key of watchedKeys) {
      if (key === 'hidden' || key === 'hiddenInert') {
        this._unsubs.push(this._state.on(key, () => this.applyHidden(), { immediate: false }));
      } else {
        this._unsubs.push(this._state.on(key, () => this.requestRender(), { immediate: false }));
      }
    }

    container.appendChild(this._host);
    this.doRender();
    this.applyHidden();

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

    if (this._host?.parentElement) {
      this._host.parentElement.removeChild(this._host);
    }
    Component._byHost.delete(this._host);

    this._mounted = false;
    this._managedHostClasses = new Set();
    this._propClassNames = [];
    this.props = {};
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
      this.applyHidden();
    });
  }

  /** Perform the actual render into the host using uhtml. */
  protected doRender(): void {
    render(this._host, this.view());
  }

  /** Apply visibility on the host without triggering a render. */
  protected applyHidden(): void {
    const s = this.state();
    const host = this._host;
    if (!host) return;

    if (s.hidden) {
      host.style.display = 'none';
      host.setAttribute('aria-hidden', 'true');
      if (s.hiddenInert) {
        host.setAttribute('inert', '');
      } else {
        host.removeAttribute('inert');
      }
    } else {
      host.style.display = '';
      host.removeAttribute('aria-hidden');
      host.removeAttribute('inert');
    }
  }

  /**
   * Split raw options into reactive overrides (initial state keys) vs plain props.
   */
  protected splitOptions(
    cfg: ComponentConfig<S, any>,
    base: S
  ): {
    stateOverrides: Partial<S>;
    props: Record<string, any>;
  } {
    const stateKeys = new Set(Object.keys(base ?? {}));
    const stateOverrides: Record<string, any> = {};
    const props: Record<string, any> = {};

    for (const [k, v] of Object.entries(cfg ?? {})) {
      if (k === 'state') continue;
      if (stateKeys.has(k)) stateOverrides[k] = v;
      else props[k] = v;
    }

    return {
      stateOverrides: stateOverrides as Partial<S>,
      props
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
