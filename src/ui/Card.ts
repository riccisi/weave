import { html } from 'uhtml';
import {
    Component,
    slot,
    type ComponentConfig,
    type ComponentProps,
} from './Component';
import { mergeSchemas } from './schemaUtils';
import { content, Content, type ContentConfig } from './Content';
import type { Layout } from './layouts/Layout';
import { button, type ButtonProps, type ButtonState } from './Button';
import { alert as alertFactory, Alert, type AlertProps, type AlertState } from './Alert';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Stato visuale della Card */
export interface CardState extends ComponentState {
    title: string | null;
    imageSrc: string | null;
    imageAlt: string | null;
    imagePlacement: 'top' | 'bottom';
    imageFull: boolean;
    compact: boolean;
    glass: boolean;
    bordered: boolean;
    size: Size;
}

/** Props non reattive della Card */
export interface CardProps extends ComponentProps {

    /** Sezioni content/footer: accettano string | fn reattiva | Content | ContentConfig | Component */
    content?: string | ((s: any) => any) | Content | ContentConfig | Component<any, any>;
    footer?: string | ((s: any) => any) | Content | ContentConfig | Component<any, any>;

    /** Azioni header/body: array di config Button (non componenti già istanziati). */
    headerActions?: Array<ComponentConfig<ButtonState, ButtonProps>>;
    actions?: Array<ComponentConfig<ButtonState, ButtonProps>>; // alias legacy per body actions
    bodyActions?: Array<ComponentConfig<ButtonState, ButtonProps>>;
    /** Layout opzionale per le azioni (applicato direttamente allo slot) */
    actionsLayout?: Layout;

    /** Alert opzionale mostrato sopra al body */
    alert?: Alert | ComponentConfig<AlertState, AlertProps>;

    /** Classi extra */
    bodyClassName?: string;
    actionsClassName?: string;
}

export class Card extends Component<CardState, CardProps> {
    private _mediaChild?: Component<any, any>;
    private _contentChild?: Component<any, any>;
    private _footerChild?: Component<any, any>;
    private _headerActions: Array<Component<any, any>> = [];
    private _bodyActions: Array<Component<any, any>> = [];
    private _actionsLayout?: Layout;
    private _alertChild?: Alert;

    protected override schema(): Record<string, any> {
        return mergeSchemas(super.schema(), {
            properties: {
                title: { type: ['string', 'null'], default: null },
                imageSrc: { type: ['string', 'null'], default: null },
                imageAlt: { type: ['string', 'null'], default: 'Card image' },
                imagePlacement: { type: 'string', default: 'top' },
                imageFull: { type: 'boolean', default: false },
                compact: { type: 'boolean', default: false },
                glass: { type: 'boolean', default: false },
                bordered: { type: 'boolean', default: false },
                size: { type: 'string', default: 'md' }
            }
        });
    }

    protected override afterMount(): void {
        super.afterMount();
        const p = this.props();

        // --- Content
        this._contentChild = this.normalizeSection(p.content);
        if (this._contentChild) this._contentChild.mount(this.slotEl('content'), this);

        // --- Footer
        this._footerChild = this.normalizeSection(p.footer);
        if (this._footerChild) this._footerChild.mount(this.slotEl('footer'), this);

        this._alertChild = this.normalizeAlert(p.alert);
        if (this._alertChild) {
            this._alertChild.mount(this.slotEl('alert'), this);
            this._alertChild.el().classList.add('card-alert');
        }

        // --- Actions
        this._headerActions = this.buildActions(p.headerActions, { defaults: this.defaultHeaderActionCfg() });
        this._bodyActions   = this.buildActions(p.bodyActions ?? p.actions);

        if (this._bodyActions.length) {
            const anchor = this.slotEl('actions');
            for (const a of this._bodyActions) a.mount(anchor, this);

            if (p.actionsLayout) {
                this._actionsLayout = p.actionsLayout;
                this._actionsLayout.apply({
                    host: anchor,
                    children: this._bodyActions,
                    state: this.state(),
                    containerProps: this.props() as Record<string, any>,
                });
            }
        }

        if (this._headerActions.length) {
            const anchor = this.slotEl('header-actions');
            for (const a of this._headerActions) a.mount(anchor, this);
        }
    }

    protected override beforeUnmount(): void {
        if (this._actionsLayout) {
            this._actionsLayout.dispose?.({
                host: this.slotEl('actions'),
                children: this._bodyActions,
                state: this.state(),
                containerProps: this.props() as Record<string, any>,
            });
        }
        for (const a of this._bodyActions) a.unmount();
        this._bodyActions = [];
        for (const a of this._headerActions) a.unmount();
        this._headerActions = [];

        this._mediaChild?.unmount();  this._mediaChild = undefined;
        this._contentChild?.unmount(); this._contentChild = undefined;
        this._footerChild?.unmount(); this._footerChild = undefined;
        this._alertChild?.unmount();  this._alertChild = undefined;

        super.beforeUnmount();
    }

    protected override view() {
        const s = this.state();
        const p = this.props();

        const rootCls = [
            'card',
            s.compact ? 'card-compact' : null,
            s.imageFull ? 'image-full' : null,
            s.glass ? 'glass' : null,
            s.bordered ? 'border' : null,
            p.className ?? null,
            s.size !== 'md' ? `card-${s.size}` : null,
        ].filter(Boolean).join(' ');

        const hasBodyActions = this._bodyActions.length > 0
            || (p.bodyActions && p.bodyActions.length > 0)
            || (p.actions && p.actions.length > 0);
        const hasHeaderActions = this._headerActions.length > 0
            || (p.headerActions && p.headerActions.length > 0);

        const showHeader = !!s.title || hasHeaderActions;

        const showImage = s.imageSrc;
        const imageHole = showImage ? html`
            <figure>
                <img src=${s.imageSrc} alt=${s.imageAlt} />
            </figure>` : null;

        return html`
          <div class=${rootCls}>
            ${showImage && s.imagePlacement === 'top'
                ? imageHole
                : null
            }
            ${showHeader
                ? html`<div class="card-header flex justify-between items-center">
                         ${s.title ? html`<span class="card-title">${s.title}</span>` : null}
                         ${hasHeaderActions
                            ? html`<div class="card-actions flex gap-0.5 sm:gap-3 flex-nowrap" data-slot="header-actions"></div>`
                            : null}
                       </div>`
                : null
            } 
            ${slot('alert')}
            <div class=${['card-body', p.bodyClassName ?? ''].filter(Boolean).join(' ')}>
              <div data-slot="content" style="display: contents"></div>
              ${hasBodyActions
                ? html`<div
                         class=${['card-actions', p.actionsClassName ?? ''].filter(Boolean).join(' ')}
                         data-slot="actions"
                       ></div>`
                : null
            }
            </div>
            <div data-slot="footer" style="display: contents"></div>
              ${showImage && s.imagePlacement === 'bottom'
                  ? imageHole
                  : null
              }
          </div>
        `;
    }

    // ---------------- helpers ----------------

    /** Normalizza content/footer in un *Component* (Content incluso) */
    private normalizeSection(
        src?: string | ((s: any) => any) | Content | ContentConfig | Component<any, any> | null
    ): Component<any, any> | undefined {
        if (src instanceof Component) return src;
        if (src instanceof Content)   return src;
        if (typeof src === 'string' || typeof src === 'function' || (src && typeof src === 'object')) {
            return content(src as any);
        }
        return undefined;
    }

    private normalizeAlert(src?: CardProps['alert']): Alert | undefined {
        if (!src) return undefined;
        if (src instanceof Alert) return src;
        return alertFactory(src);
    }

    /** Converte config array → Button component, con merge opzionale di defaults e icone Tabler "short". */
    private buildActions(
        configs?: Array<ComponentConfig<ButtonState, ButtonProps>>,
        opts?: { defaults?: Partial<ButtonState> }
    ): Array<Component<any, any>> {
        if (!configs || !configs.length) return [];
        const defaults = opts?.defaults ?? {};

        return configs.map(cfg => {
            const merged: any = { ...(cfg ?? {}) };
            const state = { ...(cfg?.state ?? {}) };

            // applica defaults a livello piatto e state
            for (const [k, v] of Object.entries(defaults)) {
                if (merged[k] === undefined && state[k as keyof ButtonState] === undefined) {
                    merged[k] = v;
                }
                if (state[k as keyof ButtonState] === undefined) {
                    state[k as keyof ButtonState] = v as any;
                }
            }

            merged.state = state;
            return button(merged as ComponentConfig<ButtonState, ButtonProps>);
        });
    }

    private defaultHeaderActionCfg(): Partial<ButtonState> {
        return {
            variant: 'text',
            shape: 'circle',
            size: 'sm',
            icon: 'x',
        };
    }
}

/** Factory */
export function card(cfg: ComponentConfig<CardState, CardProps> = {}): Card {
    return new Card(cfg);
}
