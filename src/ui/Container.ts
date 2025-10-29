import { Component, type ComponentProps, type ComponentConfig } from './Component';
import { InteractiveComponent, type InteractiveComponentState } from './InteractiveComponent';
import type { Layout } from './layouts/Layout';
import {html} from "uhtml";

/**
 * Base reactive state for containers. Subclasses extend this to add layout-related fields.
 */
export interface ContainerState extends InteractiveComponentState {}

/**
 * Non-reactive configuration for container-like components.
 */
export interface ContainerProps extends ComponentProps {
  /** Optional layout instance (flexLayout(...), gridLayout(...), joinLayout(...)). */
  layout?: Layout;
  /** Children components already constructed via factories. */
  items?: Array<Component<any, any>>;
}

/**
 * Composite component capable of hosting child components and applying declarative layouts.
 *
 * Container mounts child components into off-DOM staging nodes before the first render so their hosts
 * are ready when {@link view} returns. After every render the configured {@link Layout} instance is
 * re-applied, enabling declarative flex/grid/join positioning without a global registry.
 */
export class Container<
  S extends ContainerState = ContainerState,
  P extends ContainerProps = ContainerProps
> extends InteractiveComponent<S, P> {
  protected items: Component<any, any>[] = [];
  private _layout?: Layout;
  private _layoutScheduled = false;

  protected override beforeMount(): void {
    super.beforeMount();

    const layout = this.props.layout;
    if (layout && typeof (layout as Layout).apply !== 'function') {
      throw new Error('Container.layout must be a Layout instance (use flexLayout/gridLayout/joinLayout).');
    }
    this._layout = layout as Layout | undefined;

    const incoming = Array.isArray(this.props.items)
      ? (this.props.items as Component<any, any>[])
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

    this.applyLayout();
  }

  public override setDisabledFromParent(flag: boolean): void {
    super.setDisabledFromParent(flag);
    const effective = flag || this.state().disabled === true;
    this.broadcastDisabled(!!effective);
  }

  /** view(): render child hosts within our host */
  protected override view(): any {
      return html`${this.items.map(child => child.el())}`;
  }

  /** After render, reapply the layout. */
  protected override doRender(): void {
    super.doRender();
    this.requestLayout();
  }

  /** Add a child component at runtime. */
  public add(child: Component<any, any>): this {
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
  public remove(child: Component<any, any>): this {
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
      this.applyLayout();
    });
  }

  /** Apply/reapply the active layout to the host. */
  protected applyLayout(): void {
    if (!this._layout) return;
    const host = this.el();
    if (!host) return;
    this._layout.apply({
      host,
      children: this.items,
      state: this.state(),
      containerProps: this.props as Record<string, any>
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
        containerProps: this.props as Record<string, any>
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
