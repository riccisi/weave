// src/ui/Container.ts
import { html } from 'uhtml';
import { Component, type ComponentConfig, type ComponentProps, slot } from './Component';
import { InteractiveComponent, type InteractiveComponentState } from './InteractiveComponent';
import type { Layout } from './layouts/Layout';
import { content, Content, type ContentConfig } from './Content';

/** Stato base dei container (eredita hidden/hiddenInert/disabled ecc.) */
export interface ContainerState extends InteractiveComponentState {}

/** Props non-reattive del container */
type ContainerItem = string | ((s: any) => any) | Content | ContentConfig | Component<any, any>;

export interface ContainerProps extends ComponentProps {
    /** Layout opzionale (flexLayout/gridLayout/joinLayout) */
    layout?: Layout;
    /** Figli già istanziati via factory */
    items?: Array<ContainerItem>;
}

/**
 * Composite container con slot anchoring:
 * - il root viene prodotto da `view()` (unico elemento) e adottato come host;
 * - i figli si montano dopo il primo render nello slot 'items';
 * - il Layout si applica allo slot anchor, non all’intero host.
 */
export class Container<
    S extends ContainerState = ContainerState,
    P extends ContainerProps = ContainerProps
> extends InteractiveComponent<S, P> {

    protected items: Component<any, any>[] = [];
    private _layout?: Layout;
    private _layoutScheduled = false;

    /** Prepara layout e collezione figli (nessun mount qui: lo slot non esiste ancora) */
    protected override beforeMount(): void {
        super.beforeMount();

        let p = this.props();
        const layout = p.layout;
        if (layout && typeof (layout as Layout).apply !== 'function') {
            throw new Error('Container.layout deve essere una istanza di Layout (flexLayout/gridLayout/joinLayout).');
        }
        this._layout = layout as Layout | undefined;

        const incoming = Array.isArray(p.items) ? p.items : [];
        this.items = incoming
            .map(item => this.normalizeItem(item))
            .filter((child): child is Component<any, any> => !!child);
    }

    /** Dopo mount: montiamo i figli nello slot e applichiamo il layout */
    protected override afterMount(): void {
        super.afterMount();

        for (const child of this.items) {
            child.mount(this);
        }

        // wiring disabled → broadcast
        const st = this.state();
        this._unsubs.push(
            st.on('disabled', () => {
                const effective = this._lastEffectiveDisabled || st.disabled === true;
                this.broadcastDisabled(!!effective);
            }, { immediate: true })
        );

        this.applyLayout();
    }


    /** view(): espone lo slot per i children + eventuale markup del container */
    protected override view() {
        let p = this.props();
        const cls = p.className ?? '';

        return html`<div class=${cls}></div>`;
    }

    /** Dopo ogni render del container, ripianifichiamo il layout (coalescato) */
    protected override doRender(): void {
        super.doRender();
        this.requestLayout();
    }

    /** Aggiunge un figlio a runtime */
    public add(child: Component<any, any>): this {
        this.items.push(child);
        child.mount(this);
        if (child instanceof InteractiveComponent) {
            child.setDisabledFromParent(this._lastEffectiveDisabled || this.state().disabled === true);
        }
        this.requestLayout();
        return this;
    }

    public remove(child: Component<any, any>): this {
        const idx = this.items.indexOf(child);
        if (idx >= 0) {
            this.items.splice(idx, 1);
            child.unmount();
            this.requestLayout();
        }
        return this;
    }

    /** Coalesca richieste di layout nello stesso microtask */
    protected requestLayout(): void {
        if (this._layoutScheduled) return;
        this._layoutScheduled = true;
        queueMicrotask(() => {
            this._layoutScheduled = false;
            this.applyLayout();
        });
    }

    /** Applica (o ri-applica) il layout corrente sullo **slot anchor** */
    protected applyLayout(): void {
        if (!this._layout) return;

        this._layout.apply({
            host: this.el() as HTMLElement,
            children: this.items,
            state: this.state(),
            containerProps: this.props as Record<string, any>,
        });
    }

    /** Propaga disabled a tutti i figli interattivi */
    public override setDisabledFromParent(flag: boolean): void {
        super.setDisabledFromParent(flag);
        const effective = flag || this.state().disabled === true;
        this.broadcastDisabled(!!effective);
    }

    private broadcastDisabled(force: boolean): void {
        for (const child of this.items) {
            if (child instanceof InteractiveComponent) {
                child.setDisabledFromParent(force);
            }
        }
    }

    private normalizeItem(
        src?: ContainerItem | null
    ): Component<any, any> | undefined {
        if (!src) return undefined;
        if (src instanceof Component) return src;
        if (src instanceof Content) return src;
        if (typeof src === 'string' || typeof src === 'function' || (src && typeof src === 'object')) {
            return content(src as any);
        }
        return undefined;
    }

    /** Cleanup: layout.dispose sullo slot, unmount figli, poi super */
    public override unmount(): void {
        if (this._layout) {
            const slotHost = this.slotEl('items');
            this._layout.dispose?.({
                host: slotHost,
                children: this.items,
                state: this.state(),
                containerProps: this.props as Record<string, any>,
            });
        }
        for (const child of this.items) child.unmount();
        this.items = [];
        this._layout = undefined;
        this._layoutScheduled = false;

        super.unmount();
    }
}

/** Factory ergonomica */
export function container<
    S extends ContainerState = ContainerState
>(cfg: ComponentConfig<S, ContainerProps> = {} as ComponentConfig<S, ContainerProps>): Container<S> {
    return new Container<S>(cfg);
}
