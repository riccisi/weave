import type { State } from "../state/State";
import { Component, StateInit } from "./Component";
import type { ComponentConfig } from "./Registry";
import { ComponentRegistry } from "./Registry";
import type { Layout, LayoutConfig } from "./layouts/Layout";
import { LayoutRegistry } from "./layouts/LayoutRegistry";

export class Container<S extends object = any> extends Component<S> {
    static wtype = "container";

    protected items: Component[] = [];
    private _layout?: Layout;
    private _layoutScheduled = false;

    constructor(props: Record<string, any> = {}) {
        super(props);

        // Normalizza items: istanze o config wtype
        const incoming = this.props.items as Array<Component | ComponentConfig> | undefined;
        if (incoming) {
            this.items = incoming.map((it) => (it instanceof Component ? it : ComponentRegistry.create(it)));
        }

        // Nessun default className qui: le classi del wrapper le decide il Layout.
    }

    /** Schema reattivo del container (di base vuoto, sovrascrivibile) */
    protected schema(): StateInit { return this.stateInit ?? {}; }

    protected willMount(): void {
        // 1) Istanzia il Layout (oggetto o config { type: 'join', ... })
        this._layout = LayoutRegistry.create(this.props.layout as (Layout | LayoutConfig | undefined));

        // 2) Monta i figli OFF-DOM (staging). Così hanno un host e lo stato ereditato
        //    ma non li metti nel DOM: ci penserà la view() del container.
        for (const child of this.items) {
            const staging = document.createElement("div");
            child.mount(staging, this.state());
        }
    }

    public mount(target: Element | string, parent?: Component | State): this {
        super.mount(target, parent);
        // Non montiamo più i figli QUI dentro l'host (lo fa la view)
        // Ci limitiamo a rendere: la view() inserirà i child.el()
        this.requestRender();
        return this;
    }

    /** Rende i figli (senza wrapper extra). Il Layout applica le classi al nostro host. */
    protected view() {
        return (this.items && this.items.length)
            ? (/* uhtml accetta array di nodi */ this.items.map(c => c.el()))
            : null;
    }

    /** Dopo ogni commit di render/apply, applica (o ri-applica) il layout. */
    protected doRender(): void {
        this.applyLayout();
    }

    /** Aggiunge un figlio: mount off-DOM + re-render + layout */
    public add(child: Component): this {
        this.items.push(child);
        const staging = document.createElement("div");
        child.mount(staging, this.state());
        this.requestRender();
        this.requestLayout();
        return this;
    }

    /** Rimuove un figlio: unmount + re-render + layout */
    public remove(child: Component): this {
        const idx = this.items.indexOf(child);
        if (idx >= 0) {
            this.items.splice(idx, 1);
            child.unmount();
            this.requestRender();
            this.requestLayout();
        }
        return this;
    }

    /** Coalesca le richieste di layout nella stessa microtask. */
    protected requestLayout(): void {
        if (this._layoutScheduled) return;
        this._layoutScheduled = true;
        queueMicrotask(() => {
            this._layoutScheduled = false;
            this.applyLayout();
        });
    }

    private applyLayout() {
        if (!this._layout) return;
        const host = this.el();
        if (!host) return;
        this._layout.apply({
            host,
            children: this.items,
            state: this.state(),
            props: this.props
        });
    }

    public unmount(): void {
        // Prima lascia che il layout “ripulisca” (ha ancora accesso ai child nel DOM)
        if (this._layout) {
            const host = this.el();
            if (host) {
                this._layout.dispose?.({
                    host,
                    children: this.items,
                    state: this.state(),
                    props: this.props
                });
            }
        }
        // Poi smonta i figli
        for (const child of this.items) child.unmount();

        super.unmount();
    }
}

// AUTO-REGISTER all’import del modulo
ComponentRegistry.registerClass(Container);
