// src/ui/Link.ts
import { html } from 'uhtml';
import { type ComponentConfig, type ComponentProps } from './Component';
import {
  InteractiveComponent,
  type InteractiveComponentState
} from './InteractiveComponent';
import { FlyonColorClasses, type FlyonLinkColor } from './tokens';

export type LinkDecoration = 'always' | 'hover' | 'animated';

/**
 * Reactive state for {@link Link}. Controls color, underline behaviour and icons.
 */
export interface LinkState extends InteractiveComponentState {
  /** Visible text label. */
  text: string;
  /** Destination URL. */
  href: string | null;
  /** Semantic color token. */
  color: FlyonLinkColor;
  /** Underline behaviour. */
  decoration: LinkDecoration;
  /** Optional icon class rendered before the text. */
  iconLeft: string | null;
  /** Optional icon class rendered after the text. */
  iconRight: string | null;
}

/**
 * Non-reactive configuration for {@link Link}.
 */
export interface LinkProps extends ComponentProps {
  /** Click handler executed when the host anchor is activated. */
  onClick?: (lnk: Link, ev: MouseEvent) => void;
  /** Target attribute controlling navigation context. */
  target?: string;
  /** Rel attribute for external links. */
  rel?: string;
  /** Download attribute value (true for empty attribute). */
  download?: string | boolean;
  /** Accessible label for icon-only links. */
  ariaLabel?: string;
}

/**
 * Hyperlink component matching FlyonUI link styles and variants.
 */
export class Link extends InteractiveComponent<LinkState, LinkProps> {
  static wtype = 'link';

  private _onClickBound?: (ev: MouseEvent) => void;

  /**
   * Sets up the default reactive state for {@link Link} instances.
   * Mirrors {@link InteractiveComponent.initialState} while configuring
   * link-specific defaults like color, decoration and icons.
   */
  protected override initialState(): LinkState {
    return {
      ...(super.initialState() as InteractiveComponentState),
      text: 'Link',
      href: '#',
      color: 'primary',
      decoration: 'always',
      iconLeft: null,
      iconRight: null
    } satisfies LinkState;
  }

  /**
   * Uses an anchor element as the host tag for hyperlinks.
   */
  protected override hostTag(): string {
    return 'a';
  }

  /**
   * Provides the identifier prefix used for auto-generated IDs.
   */
  protected idPrefix(): string {
    return 'lnk';
  }

  /**
   * Extends {@link InteractiveComponent.applyDisabled} to mirror disabled
   * state on the host anchor element via attributes and CSS classes.
   */
  protected override applyDisabled(): void {
    super.applyDisabled();

    const host = this.el();
    if (!host) return;

    const effective = this._lastEffectiveDisabled;
    host.classList.toggle('disabled', effective);
    host.toggleAttribute('disabled', effective);
  }

  /**
   * Renders the anchor contents and synchronises host attributes/classes based
   * on the current state and props (color, decoration, icons, targets, etc.).
   */
  protected override view() {
    const s = this.state();
    const host = this.el();
    const p = this.props;

    const classes = this.hostClasses('link');

    if (s.decoration === 'hover') {
      classes.add('link-hover');
    } else if (s.decoration === 'animated') {
      classes.add('link-animated');
    }

    const colorCls = FlyonColorClasses.link(s.color);
    if (colorCls) classes.add(colorCls);

    if (s.iconLeft || s.iconRight) {
      classes.add('inline-flex');
      classes.add('items-center');
      classes.add('gap-1.5');
    }

    this.syncHostClasses(classes);

    const href = s.href;
    if (href) {
      host.setAttribute('href', href);
    } else {
      host.removeAttribute('href');
    }

    if (p.target) host.setAttribute('target', p.target);
    else host.removeAttribute('target');

    if (p.rel) host.setAttribute('rel', p.rel);
    else host.removeAttribute('rel');

    if (p.download !== undefined && p.download !== false) {
      if (p.download === true) host.setAttribute('download', '');
      else host.setAttribute('download', p.download);
    } else {
      host.removeAttribute('download');
    }

    const ariaLabel = p.ariaLabel ?? (s.text ? undefined : 'Link');
    if (ariaLabel) host.setAttribute('aria-label', ariaLabel);
    else host.removeAttribute('aria-label');

    if (!this._onClickBound) {
      this._onClickBound = (ev: MouseEvent) => {
        if (this._lastEffectiveDisabled) {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          return;
        }
        p.onClick?.(this, ev);
      };
      host.addEventListener('click', this._onClickBound);
    }

    const leftIcon = s.iconLeft ? html`<span class=${s.iconLeft}></span>` : null;
    const rightIcon = s.iconRight ? html`<span class=${s.iconRight}></span>` : null;
    const labelNode = s.text ? html`${s.text}` : null;

    return html`${leftIcon} ${labelNode} ${rightIcon}`;
  }

  /**
   * Cleans up event listeners prior to removing the component from the DOM.
   */
  protected override beforeUnmount(): void {
    if (this._onClickBound) {
      this.el().removeEventListener('click', this._onClickBound);
      this._onClickBound = undefined;
    }
    super.beforeUnmount();
  }
}

/**
 * Factory helper to create {@link Link} instances with optional configuration.
 */
export function link(
  cfg: ComponentConfig<LinkState, LinkProps> = {}
): Link {
  return new Link(cfg);
}
