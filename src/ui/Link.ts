// src/ui/Link.ts
import { html } from 'uhtml';
import { type ComponentConfig, type ComponentProps } from './Component';
import { InteractiveComponent } from './InteractiveComponent';
import { FlyonColorClasses, type FlyonLinkColor } from './tokens';
import { icon, type Icon } from './Icon';
import { mergeSchemas } from './schemaUtils';

export type LinkDecoration = 'always' | 'hover' | 'animated';

export interface LinkState extends InteractiveComponentState {
    text: string;
    href: string | null;
    color: FlyonLinkColor;
    decoration: LinkDecoration;
    icon: string | null;
    iconPosition: 'left' | 'right';
}

export interface LinkProps extends ComponentProps {
    onClick?: (lnk: Link, ev: MouseEvent) => void;
    target?: string;
    rel?: string;
    download?: string | boolean;
    ariaLabel?: string;
}

export class Link extends InteractiveComponent<LinkState, LinkProps> {
    private _icon?: Icon;
    private _iconMountedSide: 'left' | 'right' | null = null;

    protected override schema(): Record<string, any> {
        return mergeSchemas(super.schema(), {
            properties: {
                text: { type: 'string', default: 'Link' },
                href: { type: ['string', 'null'], default: '#' },
                color: { type: 'string', default: 'primary' },
                decoration: { type: 'string', default: 'always' },
                icon: { type: ['string', 'null'], default: null },
                iconPosition: { type: 'string', enum: ['left', 'right'], default: 'left' }
            }
        });
    }

    /** Riflette subito lo stato disabled (anche se forzato dal parent). */
    protected override applyDisabled(): void {
        super.applyDisabled();
        const host = this.el();
        if (!host) return;

        const s = this.state();
        const effective = !!(this._lastEffectiveDisabled || s.disabled);

        // Anchor non supporta "disabled": usiamo ARIA + focus management + classe di stato.
        host.classList.toggle('disabled', effective);
        if (effective) {
            host.setAttribute('aria-disabled', 'true');
            host.setAttribute('tabindex', '-1');
        } else {
            host.removeAttribute('aria-disabled');
            host.removeAttribute('tabindex');
        }
    }

    protected override view() {
        const s = this.state();
        const p = this.props();

        const cls: string[] = ['link'];

        switch (s.decoration) {
            case 'hover': cls.push('link-hover'); break;
            case 'animated': cls.push('link-animated'); break;
            case 'always': default: break;
        }

        const colorCls = FlyonColorClasses.link(s.color);
        if (colorCls) cls.push(colorCls);

        if (s.icon) {
            cls.push('inline-flex', 'items-center', 'gap-1.5');
        }

        const ariaLabel = p.ariaLabel ?? (s.text ? undefined : 'Link');

        // Click handler come property: blocca se disabilitato, altrimenti inoltra.
        const onClick = (ev: MouseEvent) => {
            if (this._lastEffectiveDisabled || this.state().disabled) {
                ev.preventDefault();
                ev.stopImmediatePropagation();
                return;
            }
            p.onClick?.(this, ev);
        };

        // Nota: gli attributi (href/target/rel/download/aria-label) sono nel template;
        // il base class li sincronizza sull’host ad ogni render.
        return html`
        <a
          class=${cls.join(' ')}
          href=${s.href ?? null}
          target=${p.target ?? null}
          rel=${p.rel ?? null}
          download=${p.download === true ? '' : p.download ?? null}
          aria-label=${ariaLabel ?? null}
          onclick=${onClick}
        >
          <span data-slot="icon-left" style="display: contents"></span>
          ${s.text ? html`${s.text}` : null}
          <span data-slot="icon-right" style="display: contents"></span>
        </a>`;
    }

    protected override afterMount(): void {
        super.afterMount();
        const s = this.state();
        this._unsubs.push(
            s.on('icon', () => this.syncIcon(), { immediate: false }),
            s.on('iconPosition', () => this.syncIcon(), { immediate: false }),
        );
        this.syncIcon();
    }

    protected override beforeUnmount(): void {
        this._icon?.unmount();
        this._icon = undefined;
        this._iconMountedSide = null;
        super.beforeUnmount();
    }

    private syncIcon(): void {
        const s = this.state();
        const val = s.icon;
        const side = s.iconPosition ?? 'left';
        const slotName = side === 'right' ? 'icon-right' : 'icon-left';

        if (val) {
            if (!this._icon) {
                this._icon = icon({ state: { icon: val }, sizeClass: 'size-4' });
                this._icon.mount(this.slotEl(slotName), this);
                this._iconMountedSide = side;
            } else {
                if (this._iconMountedSide !== side) {
                    this._icon.unmount();
                    this._icon.mount(this.slotEl(slotName), this);
                    this._iconMountedSide = side;
                }
                this._icon.state().icon = val;
            }
        } else if (this._icon) {
            this._icon.unmount();
            this._icon = undefined;
            this._iconMountedSide = null;
        }
    }
}

export function link(cfg: ComponentConfig<LinkState, LinkProps> = {}): Link {
    return new Link(cfg);
}
