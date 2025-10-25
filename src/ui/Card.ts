import { html } from 'uhtml';
import type { Component as BaseComponent, ComponentConfig } from './Component';
import { Container, type ContainerProps, type ContainerSchema } from './Container';
import type { Layout, LayoutConfig } from './layouts/Layout';
import { LayoutRegistry } from './layouts/LayoutRegistry';

export type CardImagePlacement = 'top' | 'side';
export type CardActionsAlign = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export interface CardState {
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

export interface CardProps extends ContainerProps {
  actions?: Array<BaseComponent<any, any>>;
  actionsLayout?: LayoutConfig | Layout;
  bodyClassName?: string;
  figureClassName?: string;
  imageClassName?: string;
  actionsClassName?: string;
  className?: string;
}

export class Card extends Container<CardState, CardProps> {
  protected stateInit = {
    title: 'Card title',
    description: null,
    imageSrc: null,
    imageAlt: 'Card image',
    imagePlacement: 'top' as CardImagePlacement,
    compact: false,
    glass: false,
    bordered: false,
    imageFull: false,
    actionsAlign: 'end' as CardActionsAlign,
    actionsWrap: false
  } satisfies CardState;

  private _bodyLayout?: Layout;
  private _bodyLayoutScheduled = false;
  private _bodyEl?: HTMLDivElement | null;

  private _actionsContainer?: Container;
  private _actionsManagedClasses: Set<string> = new Set();
  private _actionsDisabledSnapshot?: boolean;
  private _actionsDisabledUnsub?: () => void;

  protected override beforeMount(): void {
    const layoutProp = this.props.layout as Layout | LayoutConfig | undefined;
    if (layoutProp) {
      this._bodyLayout = LayoutRegistry.create(layoutProp);
      (this.props as CardProps).layout = undefined;
    }

    super.beforeMount();

    if (layoutProp !== undefined) {
      (this.props as CardProps).layout = layoutProp;
    }

    const actions = this.props.actions ?? [];
    if (actions.length) {
      const opts: ComponentConfig<ContainerSchema, ContainerProps> = {
        items: actions,
        layout: this.props.actionsLayout
      };
      this._actionsContainer = new Container(opts);
      const staging = document.createElement('div');
      this._actionsContainer.mount(staging, this.state());
    }

    this._actionsDisabledUnsub = this.state().on(
      'disabled',
      (disabled: boolean) => this.syncActionsDisabled(disabled),
      { immediate: true }
    );
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
    const bodyClasses = this.classesToString(
      this.hostClasses('card-body', this.props.bodyClassName)
    );

    const title = s.title ? html`<h2 class="card-title">${s.title}</h2>` : null;
    const description = s.description ? html`<p>${s.description}</p>` : null;
    const content = super.view();
    const actions = this.renderActions();

    return html`<div class=${bodyClasses}>${title} ${description} ${content} ${actions}</div>`;
  }

  private renderImage() {
    const s = this.state();
    const src = s.imageSrc?.trim();
    if (!src) return null;
    const alt = s.imageAlt ?? '';
    const figureClasses = this.classesToString(
      this.hostClasses('card-image', this.props.figureClassName)
    );
    const imgClasses = this.classesToString(
      this.hostClasses('rounded-xl', this.props.imageClassName)
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
      props: this.props
    });
  }

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
      this.props.actionsClassName
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

  private classesToString(classes: Iterable<string>): string {
    return Array.from(classes).join(' ');
  }

  public override beforeUnmount(): void {
    if (this._bodyLayout && this._bodyEl) {
      this._bodyLayout.dispose?.({
        host: this._bodyEl,
        children: this.items,
        state: this.state(),
        props: this.props
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

export function card(
  cfg: ComponentConfig<CardState, CardProps> = {}
): Card {
  return new Card(cfg);
}
