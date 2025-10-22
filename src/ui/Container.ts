import { html } from 'uhtml';
import { Component, StateInit } from './Component';
import type { ComponentConfig } from './Registry';
import { ComponentRegistry } from './Registry';
import type { Layout, LayoutConfig } from './layouts/Layout';
import { LayoutRegistry } from './layouts/LayoutRegistry';

/**
 * Generic container:
 * - materializza i figli (istanze o config wtype),
 * - li monta off-DOM per ereditare lo State del parent,
 * - li rende nella propria view,
 * - applica un Layout (facoltativo) dopo ogni commit.
 *
 * Nessuna classe CSS di default: lo stile del wrapper è responsabilità del Layout.
 */
export class Container<S extends object = any> extends Component<S> {
    static wtype = 'container';

    /** Component children (istanze) gestiti dal container */
    protected items: Component[] = [];

    /** Layout applicato al wrapper del container (join, vbox, grid, …) */
    private _layout?: Layout;

    /** Flag per coalescere applyLayout() nella stessa microtask */
    private _layoutScheduled = false;

    constructor(props: Record<string, any> = {}) {
        super(props);
    }

    /**
     * Lifecycle: prima del primo render.
     * - istanzia il layout dalla props (oggetto o { type, ... }),
     * - normalizza i children (istanze o config) e li monta off-DOM.
     */
    protected beforeMount(): void {
        // 1) Layout
        this._layout = LayoutRegistry.create(
            this.props.layout as (Layout | LayoutConfig | undefined)
        );

        // 2) Children: accettiamo `items` (canonico) o `children` (alias ergonomico)
        const incoming = (this.props.items ?? this.props.children) as
            | Array<Component | ComponentConfig>
            | undefined;

        if (!incoming) {
            this.items = [];
            return;
        }

        // materializza istanze
        this.items = incoming.map((it) =>
            it instanceof Component ? it : ComponentRegistry.create(it)
        );

        // mount off-DOM per ereditare state/ctx, senza inserirli ancora nel DOM del container
        for (const child of this.items) {
            const staging = document.createElement('div');
            child.mount(staging, this.state());
        }
    }

    /**
     * View: inserisce gli host dei figli nel wrapper del container.
     * Il Layout verrà applicato dopo il commit (doRender()).
     */
    protected view() {
        return html`${this.items.map((c) => c.el())}`;
    }

    /**
     * Dopo ogni commit: prima render, poi applicazione layout (idempotente).
     */
    protected doRender(): void {
        super.doRender();
        this.applyLayout();
    }

    // -------------------------------------------------------------------------
    //  API dinamiche (add/remove) con coalescing del layout
    // -------------------------------------------------------------------------

    /**
     * Aggiunge un figlio.
     * - monta off-DOM (eredita lo state subito),
     * - chiede re-render e applyLayout coalescato.
     */
    public add(child: Component): this {
        this.items.push(child);
        const staging = document.createElement('div');
        child.mount(staging, this.state());
        this.requestRender();
        this.requestLayout();
        return this;
    }

    /**
     * Rimuove un figlio:
     * - unmount del figlio,
     * - re-render e applyLayout coalescato.
     */
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

    /**
     * Coalesca le richieste di layout nella stessa microtask.
     * Utile quando arrivano più add/remove consecutivi.
     */
    protected requestLayout(): void {
        if (this._layoutScheduled) return;
        this._layoutScheduled = true;
        queueMicrotask(() => {
            this._layoutScheduled = false;
            this.applyLayout();
        });
    }

    /** Applica (o ri-applica) il layout in modo idempotente. */
    protected applyLayout(): void {
        if (!this._layout) return;
        const host = this.el();
        if (!host) return;
        this._layout.apply({
            host,
            children: this.items,
            state: this.state(),
            props: this.props,
        });
    }

    /**
     * Lifecycle: prima dello smontaggio.
     * - consente al layout di ripulire classi/effetti,
     * - smonta tutti i figli,
     * - poi delega al super per rimuovere l'host.
     */
    public beforeUnmount(): void {
        if (this._layout) {
            const host = this.el();
            if (host) {
                this._layout.dispose?.({
                    host,
                    children: this.items,
                    state: this.state(),
                    props: this.props,
                });
            }
        }
        for (const child of this.items) child.unmount();
    }
}

ComponentRegistry.registerClass(Container);