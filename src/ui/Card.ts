import { html } from 'uhtml';
import type { Component as BaseComponent, ComponentConfig } from './Component';
import {
  Container,
  type ContainerProps,
  type ContainerState
} from './Container';
import type { Layout } from './layouts/Layout';

export type CardImagePlacement = 'top' | 'side';
export type CardActionsAlign = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

/**
 * Reactive state describing the card layout, media and action presentation.
 */
export interface CardState extends ContainerState {
  title: string | null;
  description: string | null;
  imageSrc: string | null;
  imageAlt: string;
  imagePlacement: CardImagePlacement;
  compact: boolean;
  glass: boolean;
  bordered: boolean;
  imageFull: boolean;
  actionsAlign: CardActionsAlign;
  actionsWrap: boolean;
}

/**
 * Non-reactive card configuration including actions and custom class hooks.
 */
export interface CardProps extends ContainerProps {
  actions?: Array<BaseComponent<any, any>>;
  actionsLayout?: Layout;
  bodyClassName?: string;
  figureClassName?: string;
  imageClassName?: string;
  actionsClassName?: string;
}

/**
 * Composite component combining media, text and child content inside a FlyonUI card shell.
 */
export class Card extends Container<CardState, CardProps> {
  private _bodyLayout?: Layout;
  private _bodyLayoutScheduled = false;
  private _bodyEl?: HTMLDivElement | null;

  private _actionsContainer?: Container;
  private _actionsManagedClasses: Set<string> = new Set();
  private _actionsDisabledUnsub?: () => void;

  protected override initialState(): CardState {
    return {
      ...(super.initialState() as ContainerState),
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
      actionsWrap: false
    } satisfies CardState;
  }

  protected override beforeMount(): void {
    const props = this.props as CardProps;
    const layoutProp = props.layout as Layout | undefined;
    if (layoutProp) {
      if (typeof layoutProp.apply !== 'function') {
        throw new Error('Card.layout must be a Layout instance (use flexLayout/gridLayout/joinLayout).');
      }
      this._bodyLayout = layoutProp;
      props.layout = undefined;
    }

    super.beforeMount();

    if (layoutProp !== undefined) {
      props.layout = layoutProp;
    }

    const actions = props.actions ?? [];
    if (actions.length) {
      const actionsLayout = props.actionsLayout;
      if (actionsLayout && typeof actionsLayout.apply !== 'function') {
        throw new Error('Card.actionsLayout must be a Layout instance.');
      }
      const opts: ComponentConfig<ContainerState, ContainerProps> = {
        items: actions,
        layout: actionsLayout
      };
      this._actionsContainer = new Container(opts);
      const staging = document.createElement('div');
      this._actionsContainer.mount(staging, this.state());
      this.syncActionsDisabled();
    }

    this._actionsDisabledUnsub = this.state().on(
      'disabled',
      () => this.syncActionsDisabled(),
      { immediate: true }
    );
  }

  public override setDisabledFromParent(flag: boolean): void {
    super.setDisabledFromParent(flag);
    this.syncActionsDisabled();
  }

  protected override view() {
    const s = this.state();

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

  protected override doRender(): void {
    super.doRender();

    this._bodyEl = this.el()?.querySelector('.card-body');
    this.applyBodyLayout();
    this.applyActionsClasses();
  }

  protected override requestLayout(): void {
    super.requestLayout();
    this.requestBodyLayout();
  }

  private renderBody() {
    const s = this.state();
    const props = this.props as CardProps;
    const bodyClasses = this.classesToString(
      this.hostClasses('card-body', props.bodyClassName)
    );

    const title = s.title ? html`<h2 class="card-title">${s.title}</h2>` : null;
    const description = s.description ? html`<p>${s.description}</p>` : null;
    const content = super.view();
    const actions = this.renderActions();

    return html`<div class=${bodyClasses}>${title} ${description} ${content} ${actions}</div>`;
  }

  private renderImage() {
    const s = this.state();
    const props = this.props as CardProps;
    const src = s.imageSrc?.trim();
    if (!src) return null;
    const alt = s.imageAlt ?? '';
    const figureClasses = this.classesToString(
      this.hostClasses('card-image', props.figureClassName)
    );
    const imgClasses = this.classesToString(
      this.hostClasses('rounded-xl', props.imageClassName)
    );
    return html`<figure class=${figureClasses}><img src=${src} alt=${alt} class=${imgClasses} /></figure>`;
  }

  private renderActions() {
    if (!this._actionsContainer) return null;
    return this._actionsContainer.el();
  }

  private requestBodyLayout(): void {
    if (!this._bodyLayout || this._bodyLayoutScheduled) return;
    this._bodyLayoutScheduled = true;
    queueMicrotask(() => {
      this._bodyLayoutScheduled = false;
      this.applyBodyLayout();
    });
  }

  private applyBodyLayout(): void {
    if (!this._bodyLayout) return;
    const body = (this._bodyEl ||= this.el()?.querySelector('.card-body'));
    if (!body) return;
    this._bodyLayout.apply({
      host: body,
      children: this.items,
      state: this.state(),
      containerProps: this.props as Record<string, any>
    });
  }

  private applyActionsClasses(): void {
    const host = this._actionsContainer?.el();
    if (!host) return;
    const s = this.state();
    const props = this.props as CardProps;
    const alignClass = this.actionsAlignmentClass(s.actionsAlign);
    const wrapClass = s.actionsWrap ? 'flex-wrap' : null;
    const classes = this.hostClasses(
      'card-actions',
      'items-center',
      'gap-2',
      alignClass,
      wrapClass,
      props.actionsClassName
    );

    for (const cls of this._actionsManagedClasses) {
      if (!classes.has(cls)) host.classList.remove(cls);
    }
    for (const cls of classes) {
      if (!this._actionsManagedClasses.has(cls)) host.classList.add(cls);
    }
    this._actionsManagedClasses = classes;
  }

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

  private syncActionsDisabled(): void {
    if (!this._actionsContainer) return;
    const effective = this._lastEffectiveDisabled || this.state().disabled === true;
    this._actionsContainer.setDisabledFromParent(!!effective);
  }

  private classesToString(classes: Iterable<string>): string {
    return Array.from(classes).join(' ');
  }

  public override beforeUnmount(): void {
    if (this._bodyLayout && this._bodyEl) {
      this._bodyLayout.dispose?.({
        host: this._bodyEl,
        children: this.items,
        state: this.state(),
        containerProps: this.props as Record<string, any>
      });
    }
    this._bodyLayout = undefined;
    this._bodyLayoutScheduled = false;
    this._bodyEl = undefined;

    this._actionsDisabledUnsub?.();
    this._actionsDisabledUnsub = undefined;
    if (this._actionsContainer) {
      this._actionsContainer.unmount();
      this._actionsContainer = undefined;
    }
    this._actionsManagedClasses = new Set();

    super.beforeUnmount();
  }
}

export function card(
  cfg: ComponentConfig<CardState, CardProps> = {}
): Card {
  return new Card(cfg);
}
