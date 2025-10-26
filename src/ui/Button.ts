// src/ui/Button.ts
import { html } from 'uhtml';
import { ComponentConfig } from './Component';
import {
  InteractiveComponent,
  type InteractiveState
} from './InteractiveComponent';
import { FlyonColor, FlyonColorClasses } from './tokens';

type Variant = 'solid' | 'soft' | 'outline' | 'text' | 'gradient';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type Shape = 'rounded' | 'pill' | 'circle' | 'square';

export interface ButtonState extends InteractiveState {
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
  iconLeft: string | null;
  iconRight: string | null;
  customColor: string | null;
  /** backward compat shortcut for color; 'neutral' -> 'default' */
  kind?: 'primary' | 'secondary' | 'neutral';
}

export interface ButtonProps {
  onClick?: (btn: Button, ev: MouseEvent) => void;
  ariaLabel?: string;
  waves?: boolean;
  wavesTone?: string;
  /** Additional CSS classes to merge in */
  className?: string;
  /** Legacy "kind" prop to map to color */
  kind?: 'primary' | 'secondary' | 'neutral';
}

export class Button extends InteractiveComponent<ButtonState> {
  static wtype = 'button';

  private _appliedClasses: Set<string> = new Set();
  private _onClickBound?: (ev: MouseEvent) => void;

  protected override initialState(): ButtonState {
    return {
      ...(super.initialState() as InteractiveState),
      text: 'Button',
      variant: 'solid',
      color: 'default',
      size: 'md',
      wide: false,
      block: false,
      glass: false,
      active: false,
      loading: false,
      shape: 'rounded',
      iconLeft: null,
      iconRight: null,
      customColor: null
    } satisfies ButtonState;
  }

  protected override hostTag(): string {
    return 'button';
  }

  protected override beforeMount(): void {
    super.beforeMount();

    const s = this.state();
    const kind = this.props.kind ?? s.kind;
    if (kind) {
      s.color = kind === 'neutral' ? 'default' : (kind as FlyonColor);
    }

    this.applyDisabled();
  }

  protected override applyDisabled(): void {
    super.applyDisabled();

    const s = this.state();
    const host = this.el();
    if (!host) return;

    const effective = this._lastEffectiveDisabled || s.loading;

    host.classList.toggle('btn-disabled', effective);
    host.toggleAttribute('disabled', effective);

    if (s.loading) {
      host.setAttribute('aria-busy', 'true');
    } else {
      host.removeAttribute('aria-busy');
    }
  }

  protected override view() {
    const s = this.state();
    const host = this.el();
    const p = this.props as ButtonProps;

    const classes = new Set<string>(['btn']);

    switch (s.variant) {
      case 'soft':
        classes.add('btn-soft');
        break;
      case 'outline':
        classes.add('btn-outline');
        break;
      case 'text':
        classes.add('btn-text');
        break;
      case 'gradient':
        classes.add('btn-gradient');
        break;
      case 'solid':
      default:
        break;
    }

    const colorCls = FlyonColorClasses.button(s.color);
    if (colorCls) classes.add(colorCls);

    if (s.size !== 'md') {
      classes.add(`btn-${s.size}`);
    }

    if (s.shape === 'pill') {
      classes.add('rounded-full');
    } else if (s.shape === 'circle') {
      classes.add('btn-circle');
    } else if (s.shape === 'square') {
      classes.add('btn-square');
    }

    if (s.wide) classes.add('btn-wide');
    if (s.block) classes.add('btn-block');
    if (s.glass) classes.add('glass');

    if (s.active) {
      classes.add('btn-active');
    }

    if (p.waves) {
      classes.add('waves');
      if (p.wavesTone) {
        classes.add(`waves-${p.wavesTone}`);
      }
    }

    if (typeof p.className === 'string') {
      for (const token of p.className.split(/\s+/).filter(Boolean)) {
        classes.add(token);
      }
    }

    for (const cls of this._appliedClasses) {
      if (!classes.has(cls)) {
        host.classList.remove(cls);
      }
    }
    for (const cls of classes) {
      host.classList.add(cls);
    }
    this._appliedClasses = new Set(classes);

    const ariaLabel = p.ariaLabel ?? (s.text ? undefined : 'Button');
    if (ariaLabel) {
      host.setAttribute('aria-label', ariaLabel);
    } else {
      host.removeAttribute('aria-label');
    }

    if (!colorCls && s.customColor) {
      host.style.setProperty('--btn-color', s.customColor);
    } else {
      host.style.removeProperty('--btn-color');
    }

    if (!this._onClickBound && p.onClick) {
      this._onClickBound = (ev: MouseEvent) => p.onClick!(this, ev);
      host.addEventListener('click', this._onClickBound);
    }

    const spinner = s.loading
      ? html`<span class="loading loading-spinner"></span>`
      : null;
    const leftIcon = s.iconLeft
      ? html`<span class=${s.iconLeft}></span>`
      : null;
    const rightIcon = s.iconRight
      ? html`<span class=${s.iconRight}></span>`
      : null;
    const labelNode = s.text ? html`${s.text}` : null;

    return html`${leftIcon} ${spinner} ${labelNode} ${rightIcon}`;
  }

  protected override beforeUnmount(): void {
    if (this._onClickBound) {
      this.el().removeEventListener('click', this._onClickBound);
      this._onClickBound = undefined;
    }
    this._appliedClasses.clear();
  }
}

export function button(
  cfg: ComponentConfig<ButtonState, ButtonProps> = {}
): Button {
  return new Button(cfg);
}
