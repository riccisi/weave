import { html } from 'uhtml';
import { slot, Component, type ComponentConfig, type ComponentProps } from './Component';
import { Button } from './Button';
import { FlyonColor, FlyonColorClasses } from './tokens';
import { content, Content, type ContentConfig } from './Content'; // nuovo Content unificato
import { mergeSchemas } from './schemaUtils';

export type Variant = 'solid' | 'soft' | 'outline' | 'dashed';

export interface AlertState extends ComponentState {
    variant: Variant;
    color: FlyonColor;
    title: string | null;
    icon: string | null;
}

export interface AlertProps extends ComponentProps {
    /** Contenuto dell’alert: string | (s)=>uhtml|string | ContentConfig | Content */
    content?: string | ((s: any) => any) | ContentConfig | Content;

    /** Pulsanti azione renderizzati nello slot 'actions'. */
    actions?: Button[];
}

export class Alert extends Component<AlertState, AlertProps> {
    private _buttons: Button[] = [];
    private _content?: Content;

    protected override schema(): Record<string, any> {
        return mergeSchemas(super.schema(), {
            properties: {
                variant: { type: 'string', default: 'solid' },
                color: { type: 'string', default: 'default' },
                title: { type: ['string', 'null'], default: null },
                icon: { type: ['string', 'null'], default: null }
            }
        });
    }

    protected override afterMount(): void {
        super.afterMount();

        // --- Content (slot 'content')
        const p = this.props();
        this._content = this.normalizeContent(p.content);
        if (this._content) {
            this._content.mount(this.slotEl('content'), this);
        }

        // --- Action
        this._buttons = Array.isArray(p.actions) ? [...p.actions] : [];
        if (this._buttons.length) {
            const anchor = this.el()!.querySelector('.mt-4')!;
            for (const btn of this._buttons) btn.mount(anchor, this);
        }
    }

    protected override beforeUnmount(): void {
        for (const b of this._buttons) b.unmount();
        this._buttons = [];
        this._content?.unmount();
        this._content = undefined;
        super.beforeUnmount();
    }

    protected override view() {
        const s = this.state();
        const p = this.props();

        // Classi base + variant
        const classes = new Set<string>(['alert']);
        if (s.variant === 'soft') classes.add('alert-soft');
        if (s.variant === 'outline') classes.add('alert-outline');
        if (s.variant === 'dashed') {
            classes.add('alert-outline');
            classes.add('border-dashed');
        }

        // Colore Flyon
        const colorCls = FlyonColorClasses.alert(s.color);
        if (colorCls) classes.add(colorCls);

        classes.add('flex');
        classes.add('items-start');
        classes.add('gap-4');
        // classes.add('max-sm:flex-col');
        // classes.add('max-sm:items-center');

        const cls = Array.from(classes).join(' ');

        // Parti opzionali
        const iconEl  = s.icon  ? html`<span class="${`icon-[tabler--${s.icon}] shrink-0 size-6`}"></span>` : null;
        const titleEl = s.title ? html`<h5 class="text-lg font-semibold">${s.title}</h5>` : null;

        // Slot del contenuto ricco (fornito da Content)
        const contentSlot = slot('content');

        // Slot azioni (i Button sono montati in afterMount)
        const actionsSlot = p.actions && p.actions.length ? html`<div class="mt-4 flex gap-2"></div>` : null;

        // Layout: [icon] [ title + content ] [ actions ] [ close ]
        return html`
            <div class=${cls ?? null} role="alert">
                ${iconEl ?? null}
                ${titleEl ? html`<div class="flex flex-col gap-1">${titleEl} ${contentSlot}</div>` : html`${contentSlot}`}
                ${actionsSlot ?? null}
            </div>
        `;
    }

    // ---------- helpers -----------

    private normalizeContent(src: AlertProps['content']): Content | undefined {
        if (!src) return undefined;
        if (src instanceof Content) return src;
        // string | fn | ContentConfig → content(...)
        return content(typeof src === 'object' && !('raw' in (src as any)) ? (src as ContentConfig) : (src as any));
    }
}

export function alert(cfg: ComponentConfig<AlertState, AlertProps> = {}): Alert {
    return new Alert(cfg);
}

export function info(cfg: ComponentConfig<AlertState, AlertProps> = {}): Alert {
    return alert({ ...cfg, color: 'info', icon: 'info' });
}

export function success(cfg: ComponentConfig<AlertState, AlertProps> = {}): Alert {
    return alert({ ...cfg, color: 'success', icon: 'check' });
}

export function warning(cfg: ComponentConfig<AlertState, AlertProps> = {}): Alert {
    return alert({ ...cfg, color: 'warning', icon: 'alert-triangle' });
}

export function error(cfg: ComponentConfig<AlertState, AlertProps> = {}): Alert {
    return alert({ ...cfg, color: 'error', icon: 'x-circle' });
}
