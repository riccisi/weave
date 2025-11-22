// src/ui/Button.ts
import { html } from 'uhtml';
import { type ComponentConfig, type ComponentProps } from './Component';
import { InteractiveComponent, type InteractiveComponentState } from './InteractiveComponent';
import { FlyonColor, FlyonColorClasses } from './tokens';
import { icon, type Icon } from './Icon';

type Variant = 'solid' | 'soft' | 'outline' | 'text' | 'gradient';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type Shape = 'rounded' | 'pill' | 'circle' | 'square';

export interface ButtonState extends InteractiveComponentState {
    text: string;
    variant: Variant;
    color: FlyonColor;
    size: Size;
    wide: boolean;
    block: boolean;
    glass: boolean;
    active: boolean;
    loading: boolean;
    shape: Shape;
    icon: string | null;
    iconPosition: 'left' | 'right';
    customColor: string | null; // --btn-color
}

export interface ButtonProps extends ComponentProps {
    onClick?: (btn: Button, ev: MouseEvent) => void;
    ariaLabel?: string;
    waves?: boolean;
    wavesTone?: string;
    kind?: 'primary' | 'secondary' | 'neutral'; // alias legacy per color
    type?: 'button' | 'submit' | 'reset';
}

export class Button extends InteractiveComponent<ButtonState, ButtonProps> {
    private _iconCmp?: Icon;
    private _iconMountedSide: 'left' | 'right' | null = null;
    private _spinnerEl?: HTMLElement;

    protected override initialState(): ButtonState {
        return {
            ...(super.initialState() as InteractiveComponentState),
            text: '',
            variant: 'solid',
            color: 'default',
            size: 'md',
            wide: false,
            block: false,
            glass: false,
            active: false,
            loading: false,
            shape: 'rounded',
            icon: null,
            iconPosition: 'left',
            customColor: null,
        } satisfies ButtonState;
    }

    protected override beforeMount(): void {
        super.beforeMount();

        // Mappa alias legacy solo al mount
        const s = this.state();
        const kind = this.props().kind;
        if (kind) s.color = kind === 'neutral' ? 'default' : (kind as FlyonColor);

        // Riflette subito stato iniziale (anche se non c’è ancora un render successivo)
        this.applyDisabled();
    }

    protected override afterMount(): void {
        super.afterMount();
        // loading influenza aria-busy/disabled effettivo → riflettilo subito
        this._unsubs.push(
            this.state().on('loading', () => {
                this.applyDisabled();
                this.syncIcon();
                this.syncSpinner();
            }, { immediate: false })
        );

        // sync icone se cambiano a runtime
        this._unsubs.push(
            this.state().on('icon',         () => this.syncIcon(), { immediate: false }),
            this.state().on('iconPosition', () => this.syncIcon(), { immediate: false }),
        );

        this.syncIcon();
        this.syncSpinner();
    }

    protected override applyDisabled(): void {
        super.applyDisabled();

        const s = this.state();
        const host = this.el();
        if (!host) return;

        const effective = !!(this._lastEffectiveDisabled || s.loading || s.disabled);

        host.toggleAttribute('disabled', effective);
        host.classList.toggle('btn-disabled', effective);

        if (s.loading) host.setAttribute('aria-busy', 'true');
        else host.removeAttribute('aria-busy');
    }

    protected override view() {
        const s = this.state();
        const p = this.props();

        const cls: string[] = ['btn'];

        switch (s.variant) {
            case 'soft': cls.push('btn-soft'); break;
            case 'outline': cls.push('btn-outline'); break;
            case 'text': cls.push('btn-text'); break;
            case 'gradient': cls.push('btn-gradient'); break;
            case 'solid': default: break;
        }

        const colorCls = FlyonColorClasses.button(s.color);
        if (colorCls) cls.push(colorCls);
        if (s.size !== 'md') cls.push(`btn-${s.size}`);

        switch (s.shape) {
            case 'pill': cls.push('rounded-full'); break;
            case 'circle': cls.push('btn-circle'); break;
            case 'square': cls.push('btn-square'); break;
            case 'rounded': default: break;
        }

        if (s.wide) cls.push('btn-wide');
        if (s.block) cls.push('btn-block');
        if (s.glass) cls.push('glass');
        if (s.active) cls.push('btn-active');

        if (p.waves) {
            cls.push('waves');
            if (p.wavesTone) cls.push(`waves-${p.wavesTone}`);
        }

        const ariaLabel = p.ariaLabel ?? (s.text ? undefined : 'Button');
        const styleAttr = !colorCls && s.customColor ? `--btn-color:${s.customColor}` : null;

        const labelNode = s.text     ? html`${s.text}` : null;

        const onClick = p.onClick ? ((ev: MouseEvent) => p.onClick!(this, ev)) : null;

        // NB: niente disabled/aria-busy nel template → li gestiamo in applyDisabled()
        return html`<button
          type=${p.type ?? 'button'}
          class=${cls.join(' ')}
          style=${styleAttr}
          aria-label=${ariaLabel ?? null}
          onclick=${onClick}
        >
          <span data-slot="icon-left" style="display: contents"></span>
          ${labelNode}
          <span data-slot="icon-right" style="display: contents"></span>
        </button>`;
    }

    private syncIcon(): void {
        const s = this.state();
        const val = s.icon;
        const side = s.iconPosition ?? 'left';
        const targetSlot = side === 'right' ? 'icon-right' : 'icon-left';

        if (val) {
            if (!this._iconCmp) {
                this._iconCmp = icon({ state: { icon: val }, sizeClass: 'size-5' });
                this._iconCmp.mount(this.slotEl(targetSlot), this);
                this._iconMountedSide = side;
            } else {
                if (this._iconMountedSide !== side) {
                    this._iconCmp.unmount();
                    this._iconCmp.mount(this.slotEl(targetSlot), this);
                    this._iconMountedSide = side;
                }
                this._iconCmp.state().icon = val;
            }
            this._iconCmp.state().hidden = !!s.loading;
        } else if (this._iconCmp) {
            this._iconCmp.unmount();
            this._iconCmp = undefined;
            this._iconMountedSide = null;
        }
    }

    /** Gestisce lo spinner senza smontare icone. */
    private syncSpinner(): void {
        const host = this.el();
        if (!host) return;
        const s = this.state();

        const slotName = (s.iconPosition ?? 'left') === 'right' ? 'icon-right' : 'icon-left';
        const slot = this.slotEl(slotName);

        if (s.loading) {
            if (!this._spinnerEl) {
                const sp = document.createElement('span');
                sp.className = 'loading loading-spinner';
                this._spinnerEl = sp;
            }
            if (!slot.contains(this._spinnerEl)) {
                slot.appendChild(this._spinnerEl);
            }
        } else if (this._spinnerEl?.parentElement) {
            this._spinnerEl.parentElement.removeChild(this._spinnerEl);
        }
    }
}

export function button(cfg: ComponentConfig<ButtonState, ButtonProps> = {}): Button {
    return new Button(cfg);
}
