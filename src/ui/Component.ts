import { render } from "uhtml";
import { State } from "../state/State";
import { ReactiveRuntime } from "../state/ReactiveRuntime";

export type StateInit = Record<string, any>;

export abstract class Component<S extends object = any> {

    private static _byHost = new WeakMap<HTMLElement, Component>();

    /** Ogni sottoclasse può dichiarare static wtype = '...' per auto-register. */
    static wtype?: string;

    protected _state!: State & S;
    protected _host!: HTMLElement;
    protected _mounted = false;
    protected _parentState?: State;

    protected opts: Record<string, any>;
    protected props: Record<string, any> = {};

    private _unsubs: Array<() => void> = [];
    private _renderQueued = false;

    protected stateInit?: StateInit;

    constructor(opts: Record<string, any> = {}) {
        this.opts = opts;
    }

    protected schema(): StateInit { return this.stateInit ?? {}; }
    protected view(): any { return null; }
    protected hostTag(): string { return "div"; }

    protected willMount(): void {}
    protected didMount(): void {}
    protected willUnmount(): void {}

    public state(): State & S { return this._state; }
    public el(): HTMLElement { return this._host; }

    public mount(target: Element | string, parent?: Component | State): this {
        if (this._mounted) return this;
        const container = typeof target === "string" ? document.querySelector(target)! : target;
        if (!container) throw new Error("Mount target not found");

        if (parent instanceof Component) this._parentState = parent.state();
        else if (parent) this._parentState = parent;

        const { stateOverrides, props } = this.splitOptions(this.opts, this.schema());
        this.props = props;

        const runtime = (this._parentState as any)?._runtime as ReactiveRuntime | undefined;
        const base = this.schema();
        const init = { ...base, ...stateOverrides };
        this._state = new State(init, this._parentState, runtime) as State & S;

        this._host = document.createElement(this.hostTag());
        if (typeof this.opts.className === "string") this._host.className = this.opts.className;

        this.willMount();
        for (const key of Object.keys(base)) {
            this._unsubs.push(this._state.on(key, () => this.requestRender(), { immediate: false }));
        }

        container.appendChild(this._host);
        this.doRender();
        this._mounted = true;
        this.didMount();
        Component._byHost.set(this._host, this);
        return this;
    }

    public unmount(): void {
        if (!this._mounted) return;
        this.willUnmount();
        for (const off of this._unsubs) off();
        this._unsubs = [];
        if (this._host.parentElement) this._host.parentElement.removeChild(this._host);
        Component._byHost.delete(this._host);
        this._mounted = false;
    }

    /** Trova l’istanza Weave a partire da un nodo host (se esiste). */
    public static fromElement(el: Element | null): Component | undefined {
        return el ? Component._byHost.get(el as HTMLElement) : undefined;
    }

    /** Anima (usando le classi Tailwind/Flyon) e poi chiama unmount(). */
    public requestRemove(opts: { timeoutMs?: number } = {}): void {
        const host = this._host;
        if (!host) return;

        // Le classi 'removing:*' devono già essere presenti nel template per farle generare a Tailwind.
        host.classList.add('removing');

        // Assicura una transizione sul host (se non l’hai già nel template puoi aggiungere queste classi globalmente)
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
        setTimeout(() => { if (!fired) { host.removeEventListener('transitionend', onEnd); done(); }}, Math.max(total, safety));
    }

    protected requestRender(): void {
        if (this._renderQueued) return;
        this._renderQueued = true;
        queueMicrotask(() => {
            this._renderQueued = false;
            this.doRender();
        });
    }

    protected doRender(): void {
        render(this._host, this.view());
    }

    protected splitOptions(
        opts: Record<string, any>,
        schema: StateInit
    ): { stateOverrides: Partial<S>; props: Record<string, any> } {
        const keys = new Set(Object.keys(schema));
        const stateOverrides: Record<string, any> = {};
        const props: Record<string, any> = {};

        const legacyState = (opts && typeof opts.state === "object") ? (opts.state as Record<string, any>) : undefined;
        const srcs: Record<string, any>[] = [];
        if (legacyState) srcs.push(legacyState);
        srcs.push(opts);

        const RESERVED = new Set(["wtype", "items", "path"]);

        for (const src of srcs) {
            for (const [k, v] of Object.entries(src)) {
                if (k === "state") continue;
                if (RESERVED.has(k)) continue;
                if (keys.has(k)) stateOverrides[k] = v;
                else props[k] = v;
            }
        }
        return { stateOverrides: stateOverrides as Partial<S>, props };
    }

    private getTransitionTotalMs(el: HTMLElement): number {
        const cs = getComputedStyle(el);
        const dur = cs.transitionDuration.split(',').map(s => s.trim()).map(this.parseTime);
        const del = cs.transitionDelay.split(',').map(s => s.trim()).map(this.parseTime);
        const pairs = dur.map((d, i) => d + (del[i] ?? 0));
        return pairs.length ? Math.max(...pairs) : 0;
    }

    private parseTime(s: string): number {
        return s.endsWith('ms') ? +s.slice(0,-2) : s.endsWith('s') ? +s.slice(0,-1)*1000 : 0;
    }
}