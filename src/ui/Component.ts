import { render } from 'uhtml';
import { State } from '../state/State';
import { ReactiveRuntime } from '../state/ReactiveRuntime';
import type { ComponentProps } from './types';

/**
 * Reactive state shared by all Weave components.
 *
 * Subclasses extend this interface to expose their own reactive fields. The base keys control
 * visibility and interactivity guarantees that every component understands.
 */
export interface ComponentState {
  /**
   * When true, the component's host is visually/structurally hidden (typically display:none).
   */
  hidden: boolean;

  /**
   * When true, the component is hidden and becomes non-interactive for assistive technologies.
   */
  hiddenInert: boolean;
}

/**
 * A type-safe configuration object for building a component instance.
 *
 * The caller can supply partial reactive state {@link S} as well as non-reactive props {@link P}
 * in a single object, receiving useful IDE auto-completion for both categories.
 */
export type ComponentConfig<
  S extends ComponentState = ComponentState,
  P extends ComponentProps = ComponentProps
> = Partial<S> & Partial<Omit<P, 'state'>> & {
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
 *
 * Responsibilities:
 * - Owns a stable DOM host element (see {@link hostTag}).
 * - Creates a reactive {@link State} composed of {@link initialState} plus user overrides.
 * - Provides lifecycle hooks ({@link beforeMount}, {@link afterMount}, {@link beforeUnmount}).
 * - Performs rendering via uhtml and coalesces render requests via {@link requestRender}.
 *
 * Generics:
 * S — reactive state interface for the component.
 * P — non-reactive props interface for the component.
 */
export abstract class Component<
  S extends ComponentState = ComponentState,
  P extends ComponentProps = ComponentProps
> {
  /** Reverse lookup: DOM host → component instance. */
  private static _byHost = new WeakMap<HTMLElement, Component<any, any>>();

  /** Global incremental id sequence shared by all components. */
  private static _idSeq = 0;

  protected _state!: State & S;
  protected _host!: HTMLElement;
  protected _mounted = false;
  protected _parentState?: State;

  protected _props: P = {} as P;

  protected get props(): P {
    return this._props;
  }

  protected set props(value: P) {
    this._props = value;
  }

  protected _unsubs: Array<() => void> = [];
  protected _renderQueued = false;

  private readonly _incomingProps: ComponentConfig<S, P>;

  /** Component-wide unique id (overridable via config.id). */
  private readonly _id: string;

  /** Whether the generated id should be applied to the host element. */
  protected applyIdToHost = true;

  /** Classes currently managed by the component (diffed on every render). */
  private _managedHostClasses: Set<string> = new Set();

  /** Normalized `className` tokens provided via props (never mutated). */
  protected _propClassNames: string[] = [];

  constructor(config: ComponentConfig<S, P> = {} as ComponentConfig<S, P>) {
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
   * Returns the base reactive state for this component. Subclasses should spread
   * {@link super.initialState} and then apply their own default values.
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
   * Mount the component into a container, optionally inheriting a parent {@link State}.
   * Creates the reactive state instance, the host element, lifecycle subscriptions and
   * performs the initial render.
   */
  public mount(target: Element | string, parent?: Component<any, any> | State<any>): this {
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

    const baseState = this.initialState();
    const { stateOverrides, props, legacyState } = this.splitOptions(this._incomingProps, baseState);
    this.props = props;
    this._propClassNames = Component.normalizeClassProp(this.props.className);

    const runtime: ReactiveRuntime | undefined = (this._parentState as any)?._runtime;
    const parentState = this._parentState;
    const initial = {
      ...baseState,
      ...legacyState,
      ...stateOverrides
    };
    this._state = new State(initial, parentState, runtime) as State & S;

    this._host = document.createElement(this.hostTag());
    const propClassString = this._propClassNames.join(' ');
    if (propClassString) {
      this._host.className = propClassString;
    }
    if (this.props.id) {
      this._host.id = this.props.id;
    } else if (this.applyIdToHost) {
      this._host.id = this._id;
    }

    this.beforeMount();

    const watchedKeys = new Set<string>(Object.keys(initial ?? {}));

    for (const key of watchedKeys) {
      this._unsubs.push(
        this._state.on(
          key,
          () => this.onStateKeyChange(key as keyof S),
          { immediate: false }
        )
      );
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
    this.props = {} as P;
  }

  /** Find a component instance from a DOM node, if any. */
  public static fromElement(el: Element | null): Component<any, any> | undefined {
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
   * Split the caller-provided configuration into reactive state overrides and plain props.
   * Legacy `state` bags are merged only for keys present in {@link baseState}.
   */
  protected onStateKeyChange(key: keyof S): void {
    if (key === 'hidden' || key === 'hiddenInert') {
      this.applyHidden();
    } else {
      this.requestRender();
    }
  }

  /**
   * Split the caller-provided configuration into reactive state overrides, legacy state bag
   * and plain props. Only keys present in {@link baseState} are considered valid state overrides.
   */
  protected splitOptions(
    incoming: ComponentConfig<S, P>,
    baseState: S
  ): {
    stateOverrides: Partial<S>;
    legacyState: Partial<S>;
    props: P;
  } {
    const stateKeys = new Set(Object.keys(baseState ?? {}));

    const stateOverrides: Record<string, any> = {};
    const propsResult: Record<string, any> = {};
    const legacyResult: Record<string, any> = {};

    const legacyBag = (incoming as any)?.state;
    if (legacyBag && typeof legacyBag === 'object') {
      for (const [key, value] of Object.entries(legacyBag)) {
        if (stateKeys.has(key)) {
          legacyResult[key] = value;
        }
      }
    }

    for (const [key, value] of Object.entries(incoming ?? {})) {
      if (key === 'state') continue;
      if (stateKeys.has(key)) stateOverrides[key] = value;
      else propsResult[key] = value;
    }

    return {
      stateOverrides: stateOverrides as Partial<S>,
      legacyState: legacyResult as Partial<S>,
      props: propsResult as P
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
