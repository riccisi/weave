import { html } from 'uhtml';
import type { Component, StateInit } from './Component';
import { Container } from './Container';
import { ComponentRegistry, type ComponentConfig } from './Registry';
import type { Layout, LayoutConfig } from './layouts/Layout';
import { LayoutRegistry } from './layouts/LayoutRegistry';

export type CardImagePlacement = 'top' | 'side';
export type CardActionsAlign = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export interface CardState {
    /** Titolo mostrato nella card. */
    title: string | null;
    /** Testo descrittivo opzionale mostrato sotto il titolo. */
    description: string | null;
    /** URL dell'immagine opzionale. */
    imageSrc: string | null;
    /** Testo alternativo per l'immagine. */
    imageAlt: string;
    /** Posizionamento dell'immagine rispetto al contenuto. */
    imagePlacement: CardImagePlacement;
    /** Applica la variante compatta della card. */
    compact: boolean;
    /** Applica l'effetto glass. */
    glass: boolean;
    /** Aggiunge il bordo esterno. */
    bordered: boolean;
    /** Se true la card usa la variante image-full. */
    imageFull: boolean;
    /** Allineamento della sezione azioni. */
    actionsAlign: CardActionsAlign;
    /** Quando true permette alle azioni di andare a capo. */
    actionsWrap: boolean;
}

/**
 * FlyonUI Card.
 * - Estende Container per sfruttare items/layout, ma applica il layout al body interno.
 * - Gestisce immagine opzionale, titolo/descrizione e sezione azioni.
 */
export class Card extends Container<CardState> {
    static wtype = 'card';

    protected stateInit: StateInit = {
        title: 'Card title',
        description: null,
        imageSrc: null,
        imageAlt: 'Card image',
        imagePlacement: 'top',
        compact: false,
        glass: false,
        bordered: false,
        imageFull: false,
        actionsAlign: 'end',
        actionsWrap: false,
    } satisfies CardState;

    /** Layout applicato al body della card (non al root). */
    private _bodyLayout?: Layout;
    private _bodyLayoutScheduled = false;
    private _bodyEl?: HTMLDivElement | null;

    /** Container interno per la sezione azioni. */
    private _actionsContainer?: Container;
    private _actionsManagedClasses: Set<string> = new Set();
    private _actionsDisabledSnapshot?: boolean;
    private _actionsDisabledUnsub?: () => void;

    /**
     * Intercetta il layout prima del mount del Container base per applicarlo al body.
     * Istanzia eventuale container per la sezione azioni.
     */
    protected beforeMount(): void {
        // Layout del body: sottraiamo la prop prima di chiamare super.
        const layoutProp = this.props.layout as Layout | LayoutConfig | undefined;
        if (layoutProp) {
            this._bodyLayout = LayoutRegistry.create(layoutProp);
            (this.props as any).layout = undefined;
        }

        super.beforeMount();

        // Ripristina la prop layout per chi la legge altrove.
        if (layoutProp !== undefined) {
            (this.props as any).layout = layoutProp;
        }

        // Sezione azioni: accetta array di istanze o config.
        const actions = this.props.actions as
            | Array<Component | ComponentConfig>
            | undefined;
        if (actions && actions.length) {
            const opts: Record<string, any> = {
                items: actions,
                layout: this.props.actionsLayout,
            };
            this._actionsContainer = new Container(opts);
            const staging = document.createElement('div');
            this._actionsContainer.mount(staging, this.state());
        }

        // Sincronizza il disabled della card sulle azioni.
        this._actionsDisabledUnsub = this.state().on(
            'disabled',
            (disabled: boolean) => this.syncActionsDisabled(disabled),
            { immediate: true }
        );
    }

    /** Rende la struttura della card. */
    protected view() {
        const s = this.state();

        // Gestione classi del root.
        const rootClasses = this.hostClasses(
            'card',
            'bg-base-100',
            'shadow-md',
            s.compact ? 'card-compact' : null,
            s.imagePlacement === 'side' ? 'card-side' : null,
            s.imageFull ? 'image-full' : null,
            s.glass ? 'glass' : null,
            s.bordered ? 'border' : null
        );
        this.syncHostClasses(rootClasses);

        const image = this.renderImage();
        const body = this.renderBody();

        return html`${image} ${body}`;
    }

    /** Dopo ogni render aggiorna riferimenti e applica i layout custom. */
    protected doRender(): void {
        super.doRender();

        this._bodyEl = this.el()?.querySelector('.card-body');
        this.applyBodyLayout();
        this.applyActionsClasses();
    }

    /** Coalesca richieste di layout sul body. */
    protected requestLayout(): void {
        super.requestLayout();
        this.requestBodyLayout();
    }

    /** Render del body principale: titolo, descrizione, items e azioni. */
    private renderBody() {
        const s = this.state();
        const bodyClasses = this.classesToString(
            this.hostClasses('card-body', this.props.bodyClassName as string | undefined)
        );

        const title = s.title ? html`<h2 class="card-title">${s.title}</h2>` : null;
        const description = s.description ? html`<p>${s.description}</p>` : null;
        const content = super.view();
        const actions = this.renderActions();

        return html`<div class=${bodyClasses}>${title} ${description} ${content} ${actions}</div>`;
    }

    /** Render dell'immagine opzionale. */
    private renderImage() {
        const s = this.state();
        const src = s.imageSrc?.trim();
        if (!src) return null;
        const alt = s.imageAlt ?? '';
        const figureClasses = this.classesToString(
            this.hostClasses('card-image', this.props.figureClassName as string | undefined)
        );
        const imgClasses = this.classesToString(
            this.hostClasses('rounded-xl', this.props.imageClassName as string | undefined)
        );
        return html`<figure class=${figureClasses}><img src=${src} alt=${alt} class=${imgClasses} /></figure>`;
    }

    /** Renderizza la sezione azioni se presente. */
    private renderActions() {
        if (!this._actionsContainer) return null;
        return this._actionsContainer.el();
    }

    /** Applica (coalescendo) il layout del body. */
    private requestBodyLayout(): void {
        if (!this._bodyLayout || this._bodyLayoutScheduled) return;
        this._bodyLayoutScheduled = true;
        queueMicrotask(() => {
            this._bodyLayoutScheduled = false;
            this.applyBodyLayout();
        });
    }

    /** Applica il layout sul body (join, grid, ...). */
    private applyBodyLayout(): void {
        if (!this._bodyLayout) return;
        const body = (this._bodyEl ||= this.el()?.querySelector('.card-body'));
        if (!body) return;
        this._bodyLayout.apply({
            host: body,
            children: this.items,
            state: this.state(),
            props: this.props,
        });
    }

    /** Aggiorna le classi della sezione azioni (card-actions + allineamento). */
    private applyActionsClasses(): void {
        const host = this._actionsContainer?.el();
        if (!host) return;
        const s = this.state();
        const alignClass = this.actionsAlignmentClass(s.actionsAlign);
        const wrapClass = s.actionsWrap ? 'flex-wrap' : null;
        const classes = this.hostClasses(
            'card-actions',
            'items-center',
            'gap-2',
            alignClass,
            wrapClass,
            this.props.actionsClassName as string | undefined
        );

        for (const cls of this._actionsManagedClasses) {
            if (!classes.has(cls)) host.classList.remove(cls);
        }
        for (const cls of classes) {
            if (!this._actionsManagedClasses.has(cls)) host.classList.add(cls);
        }
        this._actionsManagedClasses = classes;
    }

    /** Ritorna la classe di allineamento corrispondente al valore richiesto. */
    private actionsAlignmentClass(align: CardActionsAlign): string | null {
        switch (align) {
            case 'start':
                return 'justify-start';
            case 'center':
                return 'justify-center';
            case 'end':
                return 'justify-end';
            case 'between':
                return 'justify-between';
            case 'around':
                return 'justify-around';
            case 'evenly':
                return 'justify-evenly';
            default:
                return null;
        }
    }

    /** Mantiene sincronizzato il disabled delle azioni con quello della card. */
    private syncActionsDisabled(containerDisabled: boolean): void {
        const container = this._actionsContainer;
        if (!container) return;
        const state = container.state() as { disabled: boolean };
        if (containerDisabled) {
            if (this._actionsDisabledSnapshot === undefined) {
                this._actionsDisabledSnapshot = state.disabled;
            }
            if (!state.disabled) state.disabled = true;
        } else if (this._actionsDisabledSnapshot !== undefined) {
            const previous = this._actionsDisabledSnapshot;
            this._actionsDisabledSnapshot = undefined;
            if (state.disabled !== previous) state.disabled = previous;
        }
    }

    /** Utility: converte un set di classi in stringa. */
    private classesToString(classes: Iterable<string>): string {
        return Array.from(classes).join(' ');
    }

    /** Cleanup personalizzato prima di delegare al Container. */
    public beforeUnmount(): void {
        if (this._bodyLayout && this._bodyEl) {
            this._bodyLayout.dispose?.({
                host: this._bodyEl,
                children: this.items,
                state: this.state(),
                props: this.props,
            });
        }
        this._bodyLayout = undefined;
        this._bodyLayoutScheduled = false;
        this._bodyEl = undefined;

        this._actionsDisabledUnsub?.();
        this._actionsDisabledUnsub = undefined;
        this._actionsDisabledSnapshot = undefined;
        if (this._actionsContainer) {
            this._actionsContainer.unmount();
            this._actionsContainer = undefined;
        }
        this._actionsManagedClasses = new Set();

        super.beforeUnmount();
    }
}

ComponentRegistry.registerClass(Card);
