// Component.ts
import { Hole, html, render } from 'uhtml';
import { State, type StateOptions } from '../state/State';
import { mergeSchemas } from './schemaUtils';
import { ReactiveRuntime } from '../state/ReactiveRuntime';
import { scheduleFlyonInit } from './flyonBridge';
import { ComponentDecorator } from './decorators/Decorator';

export type Bindable<T> = T | string | ((s: State) => T);
export type InitialState<S> = { [K in keyof S]: Bindable<S[K]> };

// ---- Slot anchoring ---------------------------------------------------------
import { SlotManager, SLOT_TAG, SLOT_ATTR, SLOT_SELECTOR } from './SlotManager';

/** Helper per dichiarare uno slot nel template uhtml */
export function slot(name = 'items'): Hole {
    const n = name ?? 'items';
    // tag statico: niente interpolazione nel nome del tag, solo nel valore dell’attributo
    return html`<weave-slot data-slot=${n} style="display: contents"></weave-slot>`;
}

export interface ComponentState {
    hidden: boolean;
    hiddenInert: boolean;
}

export interface ComponentProps {
    id?: string;
    className?: string;
    attrs?: Record<string, string | number | boolean | null | undefined>;
    state?: Record<string, any>;
    flex?: string;
    alignSelf?: 'start' | 'center' | 'end' | 'stretch';
    gridColumn?: string;
    gridRow?: string;
    placeSelf?: string;
    decorators?: ReadonlyArray<ComponentDecorator<any, any>>;
}

export type ComponentConfig<
    S extends ComponentState = ComponentState,
    P extends ComponentProps = ComponentProps
> = Partial<InitialState<S>>
    & Partial<Omit<P, 'state' | 'schema' | 'validators'>>
    & {
        state?: Record<string, any>;
        schema?: Record<string, any>;
        validators?: Record<string, (value: any, state: State & S) => string | void>;
    };

export abstract class Component<
    S extends ComponentState = ComponentState,
    P extends ComponentProps = ComponentProps
> {
    public readonly __weaveComponent = true;
    private static _byHost = new WeakMap<HTMLElement, Component<any, any>>();
    private static _idSeq = 0;

    protected _state!: State & S;
    protected _host!: HTMLElement;
    protected _container: HTMLElement | null = null;
    protected _parentState?: State;
    protected _mounted = false;

    // Flag: la view ha “rivendicato” i children dell’host?
    protected _renderedChildren = false;

    // Props e config
    protected _props: P = {} as P;
    private readonly _incomingConfig: ComponentConfig<S, P>;
    private readonly _id: string;

    // Cache per performance
    private _extraClassTokens: string[] = [];
    private _staticAttrEntries: Array<[string, string]> = [];

    // Render/reactivity
    private _renderQueued = false;
    private _depUnsubs: Array<() => void> = [];
    protected _unsubs: Array<() => void> = [];

    // “Gestiti” dal framework (evita di toccare roba terza)
    private _managedHostClasses: Set<string> = new Set();
    private _managedHostAttrs: Set<string> = new Set();
    private _managedOnClick = false;

    /** Decorators risolti (immutabili) */
    private _decorators: ReadonlyArray<ComponentDecorator<any, any>> = [];

    private _slotManager: SlotManager | null = null;

    private _savedDisplay: string | null | undefined = undefined;

    constructor(cfg: ComponentConfig<S, P> = {} as ComponentConfig<S, P>) {
        this._incomingConfig = cfg;
        this._id = this.resolveComponentId(cfg as Record<string, any>);
    }

    // nuovo hook: per default nessun valore speciale
    protected visibleDisplay(): string | null {
        return null;
    }

    // ---- lifecycle overridable ------------------------------------------------

    protected schema(): Record<string, any> {
        return {
            type: 'object',
            properties: {
                hidden: { type: 'boolean', default: false },
                hiddenInert: { type: 'boolean', default: false },
            }
        };
    }

    protected validators(): Record<string, (value: any, state: State & S) => string | void> | undefined {
        return undefined;
    }

    protected initialStateOverrides(): Partial<S> {
        return {} as Partial<S>;
    }

    protected stateOptions(): StateOptions<S> | undefined {
        return undefined;
    }

    protected initialConfig(): ComponentConfig<S, P> {
        return this._incomingConfig;
    }

    /** Deve produrre SEMPRE un singolo elemento root. */
    protected view(): Hole | null {
        return null;
    }

    protected beforeMount(): void {/* no-op */}
    protected afterMount(): void {/* no-op */}
    protected beforeUnmount(): void {/* no-op */}

    // ---- public API -----------------------------------------------------------

    public state(): State & S { return this._state; }
    public props(): P { return this._props; }
    public el(): HTMLElement { return this._host; }
    public id(): string { return this._id; }
    public mounted(): boolean { return this._mounted; }

    // Overload ergonomici
    public mount(parent: Component<any, any>): this;
    public mount(parent: Element | string, inheritFrom?: Component<any, any> | State): this;
    public mount(
        parent: Component<any, any> | Element | string,
        inheritFrom?: Component<any, any> | State
    ): this {
        if (this._mounted) return this;

        // 1) Risolvi container & parent state
        this.resolveMountTargets(parent, inheritFrom);

        // 2) Crea props/state (immutabili al mount) + decorators
        this.preparePropsAndState();

        // NEW: decorators beforeMount (no DOM garantito)
        for (const d of this._decorators) {
            d.beforeMount?.(this.buildDecoratorCtx(d));
        }

        this.beforeMount();

        // 3) Primo render → adozione root + sync + append in container
        this.doRender();
        this.applyHidden();

        // Listener base post-primo-render
        this._unsubs.push(
            this._state.on('hidden',      () => this.applyHidden(), { immediate: false }),
            this._state.on('hiddenInert', () => this.applyHidden(), { immediate: false }),
        );

        this._mounted = true;
        this.afterMount();

        // NEW: decorators afterMount (DOM e slot disponibili)
        for (const d of this._decorators) {
            d.afterMount?.(this.buildDecoratorCtx(d));
        }

        // Flyon init: solo al mount
        scheduleFlyonInit(this.flyonInitNames());

        Component._byHost.set(this._host, this);
        return this;
    }

    public unmount(): void {
        if (!this._mounted) return;

        this.beforeUnmount();

        // NEW: decorators dispose prima di toccare il DOM/slot
        for (const d of this._decorators) {
            d.dispose?.(this.buildDecoratorCtx(d));
        }

        // Cancella subscriptions
        for (const off of this._depUnsubs) off();
        this._depUnsubs = [];
        for (const off of this._unsubs) off();
        this._unsubs = [];

        this._state?.dispose?.();

        // Stacca dal DOM
        if (this._host?.parentElement) this._host.parentElement.removeChild(this._host);
        Component._byHost.delete(this._host);

        // Pulisci cache e riferimenti
        this._mounted = false;
        this._props = {} as P;
        this._managedHostClasses.clear();
        this._managedHostAttrs.clear();
        this._managedOnClick = false;
        this._extraClassTokens = [];
        this._staticAttrEntries = [];
        this._slotManager = null;
        this._container = null;
        this._parentState = undefined;
    }

    public static fromElement(el: Element | null): Component<any, any> | undefined {
        return el ? Component._byHost.get(el as HTMLElement) : undefined;
    }

    // ---- rendering/reactivity -------------------------------------------------

    protected requestRender(): void {
        if (this._renderQueued) return;
        this._renderQueued = true;
        queueMicrotask(() => {
            this._renderQueued = false;
            // Se siamo stati unmounted prima che il microtask giri, evita lavoro inutile
            if (!this._mounted && !this._host) return;
            this.doRender();
            this.applyHidden();
        });
    }

    protected doRender(): void {
        // 1) view + decorators, con auto-tracking deps
        const { value, deps } = this._state.track(() => this.applyDecorators(this.view()));

        // 2) riallinea subscriptions ai deps effettivamente letti
        this.updateDepSubscriptions(deps);

        // 3) Materializza off-screen
        const nextRoot = this.computeNextRoot(value);

        if (!this._mounted || !this._host) {
            this.adoptInitialRoot(nextRoot);
        } else {
            this.patchExistingRoot(nextRoot);
        }
    }

    protected applyHidden(): void {
        const s = this._state;
        const host = this._host;
        if (!host) return;

        if (s.hidden) {
            // salva l’inline display corrente una sola volta
            if (this._savedDisplay === undefined) {
                this._savedDisplay = host.style.display || null;
            }
            host.style.display = 'none';
            host.setAttribute('aria-hidden', 'true');
            if (s.hiddenInert) host.setAttribute('inert', '');
            else host.removeAttribute('inert');
        } else {
            // ripristina display visibile: preferisci quello del componente, altrimenti lo snapshot
            const preferred = this.visibleDisplay();
            if (preferred != null) {
                host.style.display = preferred;
            } else if (this._savedDisplay != null) {
                host.style.display = this._savedDisplay;
            } else {
                // nessun valore specifico → rimuovi l’inline, lascia lavorare le classi CSS
                host.style.removeProperty('display');
            }
            this._savedDisplay = undefined;

            host.removeAttribute('aria-hidden');
            host.removeAttribute('inert');
        }
    }

    // ---- flyon bridge ---------------------------------------------------------

    protected flyonInitNames(): string[] | undefined {
        const ctor = this.constructor as any;
        return ctor.flyonInit as string[] | undefined;
    }

    // ---- mount helpers --------------------------------------------------------

    private resolveMountTargets(
        parent: Component<any, any> | Element | string,
        inheritFrom?: Component<any, any> | State
    ): void {
        if (parent instanceof Component) {
            this._parentState = parent.state();
            this._container   = parent.el();
        } else {
            this._container = (typeof parent === 'string'
                ? document.querySelector(parent)
                : parent) as HTMLElement | null;

            if (!this._container) throw new Error('Mount target non trovato');

            this._parentState = inheritFrom
                ? (inheritFrom instanceof Component ? inheritFrom.state() : inheritFrom)
                : undefined;
        }
    }

    private preparePropsAndState(): void {
        const baseOverrides = this.initialStateOverrides();
        const schema = this.schema();
        const stateKeys = new Set<string>(Object.keys(baseOverrides ?? {}));
        if (schema?.properties) {
            for (const key of Object.keys(schema.properties)) stateKeys.add(key);
        }

        const { stateOverrides, props, userState, schema: userSchema, validators: userValidators } = this.splitOptions(this._incomingConfig, stateKeys);
        this._props = props;

        // Cache class tokens & static attrs: props sono immutabili post-mount
        this._extraClassTokens = Component.tokens(this._props.className);
        this._staticAttrEntries = this.normalizeStaticAttrs(this._props.attrs);

        // Decorators
        this._decorators = this.resolveDecoratorsOnce(this._props.decorators);
        const decoBag = this.buildDecoratorInitialBag(this._decorators);

        const runtime: ReactiveRuntime | undefined = (this._parentState as any)?._runtime;
        const initial = { ...baseOverrides, ...decoBag, ...userState, ...stateOverrides };
        const baseSchema = this.schema();
        const baseValidators = this.validators();
        const stateOpts = this.stateOptions() ?? {};
        const { schema: extraSchema, validators: extraValidators, ...restStateOpts } = stateOpts;

        const mergedSchema = this.mergeSchemas(this.mergeSchemas(baseSchema, extraSchema), userSchema);
        const mergedValidators = this.mergeValidators(
            this.mergeValidators(baseValidators, extraValidators),
            userValidators
        );
        this._state = new State(initial, {
            parent: this._parentState,
            runtime,
            ...restStateOpts,
            schema: mergedSchema,
            validators: mergedValidators
        }) as State & S;
    }

    // ---- decorator helpers ----------------------------------------------------

   private applyDecorators(hole: Hole | null): Hole {
        let res = hole ?? html``;
        for (const d of this._decorators) {
            const ctx = this.buildDecoratorCtx(d);
            res = d.wrap(res, ctx);
            d.update?.(ctx);
        }
        return res;
   }

    private resolveDecoratorsOnce(list?: ReadonlyArray<ComponentDecorator<any, any>>): ReadonlyArray<ComponentDecorator<any, any>> {
        const arr = Array.isArray(list) ? [...list] : [];
        const seen = new Set<string>();
        for (const d of arr) {
            if (!d || !d.ns) throw new Error('Decorator senza ns.');
            if (seen.has(d.ns)) throw new Error(`Decorator duplicato per ns: "${d.ns}"`);
            seen.add(d.ns);
            // hardening: defaults() deve restituire un POJO o undefined
            const def = d.defaults?.();
            if (def && (typeof def !== 'object' || Array.isArray(def))) {
                throw new Error(`Decorator "${d.ns}" defaults() deve restituire un oggetto semplice.`);
            }
        }
        arr.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
        return arr;
    }

    private buildDecoratorInitialBag(decorators: ReadonlyArray<ComponentDecorator<any, any>>): Record<string, any> {
        const bag: Record<string, any> = Object.create(null);
        for (const d of decorators) bag[d.ns] = { ...(d.defaults?.() ?? {}) };
        return bag;
    }

    private buildDecoratorCtx(d: ComponentDecorator<any, any>) {
        return {
            cmp: this,
            state: this._state,
            deco: (this._state as any)[d.ns],
            ns: d.ns,
            props: d.props?.(),
        };
    }

    // ---- render helpers -------------------------------------------------------

    private updateDepSubscriptions(deps: Set<string>): void {
        for (const off of this._depUnsubs) off();
        this._depUnsubs = [];
        for (const k of deps) {
            if (k === 'hidden' || k === 'hiddenInert') continue;
            this._depUnsubs.push(this._state.on(k, () => this.requestRender(), { immediate: false }));
        }
    }

    private computeNextRoot(v: Hole): HTMLElement {
        const staging = document.createElement('div');
        render(staging, v);
        return this.ensureSingleElementRoot(staging);
    }

    private adoptInitialRoot(nextRoot: HTMLElement): void {
        this._host = nextRoot;
        this._slotManager = new SlotManager(this._host);

        // id stabile
        this._host.id = (this._props.id && this._props.id.trim()) ? this._props.id : this._id;

        // flag children gestiti
        this._renderedChildren = this._host.childNodes.length > 0;

        // Registra gli slot presenti nel template iniziale
        this.collectSlotsFromHost();

        // Sync iniziale class/attr dal root corrente
        this.syncHostFrom(this._host);

        // Mount nel container
        this._container!.appendChild(this._host);
    }

    private patchExistingRoot(nextRoot: HTMLElement): void {
        // Il tag root NON deve cambiare dopo il mount
        if (nextRoot.tagName !== this._host.tagName) {
            throw new Error(
                `${this.constructor.name}.view()/decorator: il tag root è cambiato `
                + `(prima ${this._host.tagName}, ora ${nextRoot.tagName})`
            );
        }
        this.syncHostFrom(nextRoot);
        this.syncChildrenFrom(nextRoot);
    }

    // ---- utils ----------------------------------------------------------------

    protected splitOptions(
        incoming: ComponentConfig<S, P>,
        stateKeys: Set<string>
    ): { stateOverrides: Partial<S>; userState: Record<string, any>; props: P; schema?: Record<string, any>; validators?: Record<string, (value: any, state: State & S) => string | void> } {
        const stateOverrides: Record<string, any> = {};
        const propsResult: Record<string, any> = {};
        const userStateResult: Record<string, any> = {};
        let userSchema: Record<string, any> | undefined;
        let userValidators: Record<string, (value: any, state: State & S) => string | void> | undefined;

        const custom = (incoming as any)?.state;
        if (custom && typeof custom === 'object') {
            for (const [k, v] of Object.entries(custom)) userStateResult[k] = v;
        }
        for (const [k, v] of Object.entries(incoming ?? {})) {
            if (k === 'state') continue;
            if (k === 'validators') {
                if (v && typeof v === 'object') userValidators = v as any;
                continue;
            }
            if (k === 'schema') {
                if (v && typeof v === 'object') userSchema = v as Record<string, any>;
                continue;
            }
            if (stateKeys.has(k)) stateOverrides[k] = v;
            else propsResult[k] = v;
        }
        return {
            stateOverrides: stateOverrides as Partial<S>,
            userState: userStateResult,
            props: propsResult as P,
            schema: userSchema,
            validators: userValidators
        };
    }

    private mergeSchemas(base?: Record<string, any>, extra?: Record<string, any>): Record<string, any> | undefined {
        if (base && extra) return mergeSchemas(base, extra);
        return extra ?? base;
    }

    private mergeValidators(
        base?: Record<string, (value: any, state: State & S) => string | void>,
        extra?: Record<string, (value: any, state: State & S) => string | void>
    ): Record<string, (value: any, state: State & S) => string | void> | undefined {
        if (!base && !extra) return undefined;
        return { ...(base ?? {}), ...(extra ?? {}) };
    }

    protected resolveComponentId(config: Record<string, any>): string {
        const incomingId = typeof config.id === 'string' ? config.id.trim() : '';
        if (incomingId) return incomingId;
        const seq = ++Component._idSeq;
        return `cmp-${seq}`;
    }

    // ---- slot helpers ---------------------------------------------------------

    private isSlotElement(el: Element | null | undefined): el is HTMLElement {
        return this._slotManager?.isSlot(el) ?? false;
    }

    private collectSlotsFromHost(): Map<string, HTMLElement> {
        if (!this._slotManager) this._slotManager = new SlotManager(this._host);
        return this._slotManager.collectFromHost();
    }

    private createAndRegisterSlot(name: string, attachToHost = true): HTMLElement {
        if (!this._slotManager) this._slotManager = new SlotManager(this._host);
        const el = this._slotManager.ensure(name, attachToHost);
        return el;
    }

    /** Restituisce l’anchor element dello slot richiesto (crea se mancante). */
    public slotEl(name = 'items'): HTMLElement {
        if (!this._slotManager) this._slotManager = new SlotManager(this._host);
        // ensure attach to host: true solo quando host esiste
        return this._slotManager.ensure(name, true);
    }

    // ---- DOM helpers ----------------------------------------------------------


    private ensureSingleElementRoot(staging: HTMLElement): HTMLElement {
        // caso ideale: già un solo elemento
        const only = staging.firstElementChild as HTMLElement | null;
        if (only && staging.childElementCount === 1) {
            return only;
        }

        // fallback: crea wrapper <div style="display: contents"> e sposta TUTTI i child nodes
        const wrapper = document.createElement('div');
        wrapper.style.display = 'contents';
        while (staging.firstChild) wrapper.appendChild(staging.firstChild);
        return wrapper;
    }

    private static tokens(str?: string): string[] {
        if (!str) return [];
        return str.split(/\s+/).map(s => s.trim()).filter(Boolean);
    }

    private normalizeStaticAttrs(attrs?: Record<string, any>): Array<[string, string]> {
        if (!attrs) return [];
        const out: Array<[string, string]> = [];
        for (const [k, v] of Object.entries(attrs)) {
            if (v === false || v == null) continue;
            out.push([k, v === true ? '' : String(v)]);
        }
        return out;
    }

    private syncHostFrom(next: HTMLElement): void {
        const host = this._host;

        // CLASSI (gestite): union(view.classList, props.className pre-tokenizzata)
        const nextClasses = new Set<string>(next.classList ? Array.from(next.classList) : []);
        for (const extra of this._extraClassTokens) nextClasses.add(extra);

        // rimuovi SOLO quelle gestite in precedenza ma non più presenti
        for (const cls of this._managedHostClasses) {
            if (!nextClasses.has(cls)) host.classList.remove(cls);
        }
        // aggiungi nuove
        for (const cls of nextClasses) {
            if (!host.classList.contains(cls)) host.classList.add(cls);
        }
        this._managedHostClasses = nextClasses;

        // ATTRIBUTI (gestiti): copia tutti da next (tranne id/class) + props.attrs statiche (cached)
        const nextAttrs = new Map<string, string | null>();
        for (const name of next.getAttributeNames()) {
            if (name === 'id' || name === 'class') continue;
            nextAttrs.set(name, next.getAttribute(name));
        }
        for (const [k, v] of this._staticAttrEntries) nextAttrs.set(k, v);

        // rimuovi SOLO quelli che gestivamo ma non esistono più
        for (const prev of this._managedHostAttrs) {
            if (!nextAttrs.has(prev)) host.removeAttribute(prev);
        }
        // applica/aggiorna
        for (const [k, v] of nextAttrs) {
            if (v === null) host.removeAttribute(k);
            else host.setAttribute(k, v);
        }
        this._managedHostAttrs = new Set(nextAttrs.keys());

        // EVENTI base (gestiti): onclick property
        if ('onclick' in next) {
            const handler = (next as any).onclick ?? null;
            (host as any).onclick = handler;
            this._managedOnClick = true;
        } else if (this._managedOnClick) {
            (host as any).onclick = null;
            this._managedOnClick = false;
        }
    }

    private syncChildrenFrom(next: HTMLElement): void {
        const nextHasKids  = next.childNodes.length > 0;
        const hostHasKids  = this._host.childNodes.length > 0;
        const nextHasSlots = Array.from(next.children).some(el => this.isSlotElement(el));

        // --- AUTO-CLAIM GATES ----------------------------------------------------
        if (!this._renderedChildren) {
            if (!nextHasKids) return; // preserva figli montati esternamente
            if (hostHasKids && !nextHasSlots) return; // evita clobber inatteso
            if (hostHasKids && nextHasSlots) {
                const anyNonSlot = Array.from(this._host.childNodes).some(
                    n => n.nodeType === Node.ELEMENT_NODE && !this.isSlotElement(n as Element)
                );
                if (anyNonSlot) return;
            }
        }

        // --- SLOT-AWARE RECONCILE ------------------------------------------------
        const { content } = this.reuseSlotsDeep(next);

        this._host.replaceChildren(content);
        if (nextHasKids) this._renderedChildren = true;
    }

    /** Sostituisce *qualsiasi* elemento slot (anche annidato) con l'anchor riusato. */
    private reuseSlotsDeep(root: HTMLElement): { anchors: Map<string, HTMLElement>; content: DocumentFragment } {
        if (!this._slotManager) this._slotManager = new SlotManager(this._host);
        return this._slotManager.reuseSlotsFrom(root);
    }
}
