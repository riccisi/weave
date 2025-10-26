import { html } from 'uhtml';
import { Component, type ComponentConfig } from './Component';
import { InteractiveComponent, type InteractiveState } from './InteractiveComponent';
import type { Layout, LayoutConfig } from './layouts/Layout';
import { LayoutRegistry } from './layouts/LayoutRegistry';

export interface ContainerState extends InteractiveState {
  // Future container-specific reactive keys go here.
}

export interface ContainerProps {
  /** Optional layout description (can be { type: 'join', ... } etc.) */
  layout?: LayoutConfig | Layout;
  /** Children components already constructed via factories. */
  items?: Array<Component<any>>;
  /** Extra class names for the host */
  className?: string;
}

export class Container<
  S extends ContainerState = ContainerState
> extends InteractiveComponent<S> {
  protected items: Component<any>[] = [];
  private _layout?: Layout;
  private _layoutScheduled = false;

  protected override beforeMount(): void {
    super.beforeMount();

    this._layout = LayoutRegistry.create((this.props as ContainerProps).layout);

    const incoming = Array.isArray((this.props as ContainerProps).items)
      ? ((this.props as ContainerProps).items as Component<any>[])
      : [];
    this.items = Array.from(incoming);

    for (const child of this.items) {
      const staging = document.createElement('div');
      child.mount(staging, this.state());
    }

    this.broadcastDisabled(this._lastEffectiveDisabled || this.state().disabled === true);
  }

  protected override afterMount(): void {
    super.afterMount();

    const st = this.state();
    this._unsubs.push(
      st.on(
        'disabled',
        () => {
          const effective = this._lastEffectiveDisabled || st.disabled === true;
          this.broadcastDisabled(!!effective);
        },
        { immediate: true }
      )
    );

    this.applyLayoutNow();
  }

  public override setDisabledFromParent(flag: boolean): void {
    super.setDisabledFromParent(flag);
    const effective = flag || this.state().disabled === true;
    this.broadcastDisabled(!!effective);
  }

  /** view(): render child hosts within our host */
  protected override view() {
    return html`${this.items.map((c) => c.el())}`;
  }

  /** After render, reapply the layout. */
  protected override doRender(): void {
    super.doRender();
    this.requestLayout();
  }

  /** Add a child component at runtime. */
  public add(child: Component<any>): this {
    this.items.push(child);
    const staging = document.createElement('div');
    child.mount(staging, this.state());
    child instanceof InteractiveComponent &&
      child.setDisabledFromParent(this._lastEffectiveDisabled || this.state().disabled === true);
    this.requestRender();
    this.requestLayout();
    return this;
  }

  /** Remove a child component at runtime. */
  public remove(child: Component<any>): this {
    const idx = this.items.indexOf(child);
    if (idx >= 0) {
      this.items.splice(idx, 1);
      child.unmount();
      this.requestRender();
      this.requestLayout();
    }
    return this;
  }

  /** Coalesce layout requests within the same microtask. */
  protected requestLayout(): void {
    if (this._layoutScheduled) return;
    this._layoutScheduled = true;
    queueMicrotask(() => {
      this._layoutScheduled = false;
      this.applyLayoutNow();
    });
  }

  /** Apply/reapply the active layout to the host. */
  private applyLayoutNow(): void {
    if (!this._layout) return;
    const host = this.el();
    if (!host) return;
    this._layout.apply({
      host,
      children: this.items,
      state: this.state(),
      props: this.props
    });
  }

  private broadcastDisabled(force: boolean): void {
    for (const child of this.items) {
      if (child instanceof InteractiveComponent) {
        child.setDisabledFromParent(force);
      }
    }
  }

  /** Cleanup: unmount children, dispose layout, then delegate to super. */
  public override unmount(): void {
    if (this._layout && this.el()) {
      this._layout.dispose?.({
        host: this.el(),
        children: this.items,
        state: this.state(),
        props: this.props
      });
    }

    for (const child of this.items) {
      child.unmount();
    }
    this.items = [];
    this._layout = undefined;
    this._layoutScheduled = false;

    super.unmount();
  }
}

export function container<
  S extends ContainerState = ContainerState
>(cfg: ComponentConfig<S, ContainerProps> = {} as ComponentConfig<S, ContainerProps>): Container<S> {
  return new Container<S>(cfg);
}
