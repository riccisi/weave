// src/ui/Button.ts
import { html } from 'uhtml';
import { ComponentConfig } from './Component';
import {
  InteractiveComponent,
  type InteractiveComponentState
} from './InteractiveComponent';
import type { ComponentProps } from './types';
import { FlyonColor, FlyonColorClasses } from './tokens';

type Variant = 'solid' | 'soft' | 'outline' | 'text' | 'gradient';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type Shape = 'rounded' | 'pill' | 'circle' | 'square';

/**
 * Reactive state for {@link Button}. Changes trigger re-rendering and DOM updates.
 */
export interface ButtonState extends InteractiveComponentState {
  /** Visible text label. */
  text: string;
  /** Visual treatment preset. */
  variant: Variant;
  /** Semantic color token. */
  color: FlyonColor;
  /** Size token controlling padding and font size. */
  size: Size;
  /** Whether the button should be visually wide. */
  wide: boolean;
  /** Whether the button should take the full available width. */
  block: boolean;
  /** Apply FlyonUI "glass" styling. */
  glass: boolean;
  /** Whether the button is visually marked as active. */
  active: boolean;
  /** Show an inline loading spinner. */
  loading: boolean;
  /** Shape variant controlling border radius. */
  shape: Shape;
  /** Optional icon class rendered before the text. */
  iconLeft: string | null;
  /** Optional icon class rendered after the text. */
  iconRight: string | null;
  /** Custom CSS color applied via `--btn-color`. */
  customColor: string | null;
}

/**
 * Non-reactive configuration for {@link Button}.
 */
export interface ButtonProps extends ComponentProps {
  /** Click handler executed when the host button is activated. */
  onClick?: (btn: Button, ev: MouseEvent) => void;
  /** Accessible label for icon-only buttons. */
  ariaLabel?: string;
  /** Enable FlyonUI "waves" effect. */
  waves?: boolean;
  /** Tone for the waves effect (e.g. "light", "primary"). */
  wavesTone?: string;
  /** Legacy alias to configure {@link ButtonState.color}. */
  kind?: 'primary' | 'secondary' | 'neutral';
}

/**
 * FlyonUI button implementation supporting variants, icons, loading state and waves effects.
 */
export class Button extends InteractiveComponent<ButtonState, ButtonProps> {
  static wtype = 'button';

  private _appliedClasses: Set<string> = new Set();
  private _onClickBound?: (ev: MouseEvent) => void;

  protected override initialState(): ButtonState {
    return {
      ...(super.initialState() as InteractiveComponentState),
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
    const kind = this.props.kind;
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
    const p = this.props;

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
