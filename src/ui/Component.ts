import { render } from 'uhtml';
import { State } from '../state/State';
import { ReactiveRuntime } from '../state/ReactiveRuntime';

export type StateInit = Record<string, any>;

/** Built-in visibility shared by all components */
type Visibility = {
    /** When true, the host is hidden (display:none). Bindable. */
    hidden: boolean;
    /**
     * If true, also adds aria-hidden and inert (focus & AT blocked).
     * Default: false for wide browser compatibility.
     */
    hiddenInert?: boolean;
};

/**
 * Base class for all Weave components.
 * - Owns a single, stable DOM host (see `hostTag()`).
 * - Creates a reactive `State` from the subclass schema (`stateInit` or `schema()`).
 * - Wires a simple lifecycle: `beforeMount` → render → `afterMount`, and `beforeUnmount` on tear down.
 * - Schedules re-renders when schema-keys in the state change.
 *
 * Subclasses should:
 * - override `hostTag()` if the semantic root is not a <div> (e.g., Button → <button>).
 * - implement `view()` returning a uhtml template (or `null`).
 * - optionally override `schema()` (or provide `stateInit`) to declare reactive keys.
 */
export abstract class Component<S extends object = any> {
    /** Reverse lookup: DOM host → component instance. */
    private static _byHost = new WeakMap<HTMLElement, Component>();

    /** Optional short name for registry auto-binding (e.g., 'button', 'container'). */
    static wtype?: string;

    protected _state!: State & S & Visibility;
    protected _host!: HTMLElement;
    protected _mounted = false;
    protected _parentState?: State;

    /** Raw config passed by the user (used only at construction time). */
    private readonly _incomingProps: Record<string, any>;

    /** Normalized non-reactive props (everything not in the schema). */
    protected props: Record<string, any> = {};

    /** Unsubscribe handles for state listeners. */
    private _unsubs: Array<() => void> = [];

    /** Microtask render scheduler flag. */
    private _renderQueued = false;

    /** Optional static schema; subclasses may override `schema()` instead. */
    protected stateInit?: StateInit;

    constructor(config: Record<string, any> = {}) {
        this._incomingProps = config;
    }

    /**
     * Return the reactive schema for this component.
     * Includes built-in visibility keys so they're always available and bindable.
     */
    protected schema(): StateInit {
        // Merge built-in visibility with subclass schema
        return { hidden: false, hiddenInert: false, ...(this.stateInit ?? {}) };
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

    /** Access the reactive state (typed with S). */
    public state(): State & S & Visibility {
        return this._state;
    }

    /** Access the component host element. */
    public el(): HTMLElement {
        return this._host;
    }

    /** Whether the component has been mounted. */
    public isMounted(): boolean {
        return this._mounted;
    }

    /**
     * Mount the component into a container, optionally inheriting a parent State.
     * @param target DOM element or selector to attach to.
     * @param parent a Component or a State that becomes the parent state for this component.
     */
    public mount(target: Element | string, parent?: Component | State): this {
        if (this._mounted) return this;

        const container =
            typeof target === 'string' ? (document.querySelector(target) as HTMLElement | null) : (target as HTMLElement | null);
        if (!container) throw new Error('Mount target not found');

        // Parent state resolution
        if (parent instanceof Component) this._parentState = parent.state();
        else if (parent) this._parentState = parent;

        // Full schema includes visibility (hidden/hiddenInert)
        const fullSchema = this.schema();

        // Split incoming config into state overrides (keys in schema) and plain props
        const { stateOverrides, props } = this.splitOptions(this._incomingProps, fullSchema);
        this.props = props;

        // Create reactive state inheriting the parent runtime
        const runtime: ReactiveRuntime | undefined = (this._parentState as any)?._runtime as ReactiveRuntime | undefined;
        const initial = { ...fullSchema, ...stateOverrides };
        this._state = new State(initial, this._parentState, runtime) as State & S & Visibility;

        // Create host and apply className prop (if any)
        this._host = document.createElement(this.hostTag());
        if (typeof this.props.className === 'string') this._host.className = this.props.className;

        // Lifecycle hook
        this.beforeMount();

        // Subscribe to schema keys for re-render,
        // excluding visibility toggles which are handled without forcing a re-render.
        for (const key of Object.keys(fullSchema)) {
            if (key === 'hidden' || key === 'hiddenInert') continue;
            this._unsubs.push(this._state.on(key, () => this.requestRender(), { immediate: false }));
        }
        // Visibility listeners (no template re-render needed)
        this._unsubs.push(this._state.on('hidden',      () => this.applyVisibility(), { immediate: false }));
        this._unsubs.push(this._state.on('hiddenInert', () => this.applyVisibility(), { immediate: false }));

        // Attach to DOM and render once
        container.appendChild(this._host);
        this.doRender();
        this.applyVisibility(); // align initial visibility

        this._mounted = true;

        // Lifecycle hook
        this.afterMount();

        // Reverse lookup map
        Component._byHost.set(this._host, this);
        return this;
    }

    /**
     * Unmount the component, calling `beforeUnmount()`, removing listeners,
     * and detaching the host from the DOM.
     */
    public unmount(): void {
        if (!this._mounted) return;

        this.beforeUnmount();

        for (const off of this._unsubs) off();
        this._unsubs = [];

        if (this._host.parentElement) this._host.parentElement.removeChild(this._host);
        Component._byHost.delete(this._host);

        this._mounted = false;
    }

    /** Find a component instance from a DOM node, if any. */
    public static fromElement(el: Element | null): Component | undefined {
        return el ? Component._byHost.get(el as HTMLElement) : undefined;
    }

    /**
     * Animate removal (using Tailwind/Flyon classes already present in CSS build)
     * and then unmount the component.
     * The host should have transition utilities available to get a smooth exit.
     */
    public requestRemove(opts: { timeoutMs?: number } = {}): void {
        const host = this._host;
        if (!host) return;

        // 'removing' class should be present in CSS (so Tailwind can generate it).
        host.classList.add('removing');

        // Ensure a transition exists (in case template didn't include one)
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
            this.applyVisibility(); // keep visibility in sync after every commit
        });
    }

    /** Perform the actual render into the host using uhtml. */
    protected doRender(): void {
        render(this._host, this.view());
    }

    /**
     * Apply visibility on the host without triggering a render.
     * - display:none for layout removal
     * - aria-hidden + inert (optional) for accessibility / focus management
     */
    protected applyVisibility(): void {
        const s = this.state();
        const host = this._host;
        if (!host) return;

        if (s.hidden) {
            host.style.display = 'none';
            host.setAttribute('aria-hidden', 'true');
            if (s.hiddenInert) host.setAttribute('inert', '');
        } else {
            host.style.display = '';
            host.removeAttribute('aria-hidden');
            host.removeAttribute('inert');
        }
    }

    /**
     * Split raw options into:
     * - state overrides: keys that belong to the schema (reactive);
     * - props: everything else (plain, non-reactive).
     *
     * Supports a legacy `{ state: {...} }` bag that only applies to schema keys.
     */
    protected splitOptions(
        opts: Record<string, any>,
        schema: StateInit
    ): { stateOverrides: Partial<S & Visibility>; props: Record<string, any> } {
        const schemaKeys = new Set(Object.keys(schema));
        const stateOverrides: Record<string, any> = {};
        const props: Record<string, any> = {};

        // Legacy: options.state overrides only schema keys
        const legacyState =
            opts && typeof opts.state === 'object' ? (opts.state as Record<string, any>) : undefined;
        if (legacyState) {
            for (const [k, v] of Object.entries(legacyState)) {
                if (schemaKeys.has(k)) stateOverrides[k] = v;
            }
        }

        // Flat options: schema → state; the rest → props
        for (const [k, v] of Object.entries(opts)) {
            if (k === 'state') continue;
            if (schemaKeys.has(k)) stateOverrides[k] = v;
            else props[k] = v;
        }

        return { stateOverrides: stateOverrides as Partial<S & Visibility>, props };
    }

    // ---- internal helpers -----------------------------------------------------

    private getTransitionTotalMs(el: HTMLElement): number {
        const cs = getComputedStyle(el);
        const dur = cs.transitionDuration.split(',').map((s) => s.trim()).map(this.parseTime);
        const del = cs.transitionDelay.split(',').map((s) => s.trim()).map(this.parseTime);
        const pairs = dur.map((d, i) => d + (del[i] ?? 0));
        return pairs.length ? Math.max(...pairs) : 0;
    }

    private parseTime(s: string): number {
        return s.endsWith('ms') ? +s.slice(0, -2) : s.endsWith('s') ? +s.slice(0, -1) * 1000 : 0;
    }
}
