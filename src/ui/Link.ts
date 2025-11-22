// src/ui/Link.ts
import { html } from 'uhtml';
import { type ComponentConfig, type ComponentProps } from './Component';
import { InteractiveComponent, type InteractiveComponentState } from './InteractiveComponent';
import { FlyonColorClasses, type FlyonLinkColor } from './tokens';

export type LinkDecoration = 'always' | 'hover' | 'animated';

export interface LinkState extends InteractiveComponentState {
    text: string;
    href: string | null;
    color: FlyonLinkColor;
    decoration: LinkDecoration;
    iconLeft: string | null;
    iconRight: string | null;
}

export interface LinkProps extends ComponentProps {
    onClick?: (lnk: Link, ev: MouseEvent) => void;
    target?: string;
    rel?: string;
    download?: string | boolean;
    ariaLabel?: string;
}

export class Link extends InteractiveComponent<LinkState, LinkProps> {
    protected override initialState(): LinkState {
        return {
            ...(super.initialState() as InteractiveComponentState),
            text: 'Link',
            href: '#',
            color: 'primary',
            decoration: 'always',
            iconLeft: null,
            iconRight: null,
        } satisfies LinkState;
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

        if (s.iconLeft || s.iconRight) {
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
          ${s.iconLeft ? html`<span class=${s.iconLeft}></span>` : null}
          ${s.text ? html`${s.text}` : null}
          ${s.iconRight ? html`<span class=${s.iconRight}></span>` : null}
        </a>`;
    }
}

export function link(cfg: ComponentConfig<LinkState, LinkProps> = {}): Link {
    return new Link(cfg);
}