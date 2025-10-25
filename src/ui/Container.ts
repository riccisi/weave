import { html } from 'uhtml';
import { Component, type ComponentConfig } from './Component';
import type { Component as BaseComponent } from './Component';
import type { Layout, LayoutConfig } from './layouts/Layout';
import { LayoutRegistry } from './layouts/LayoutRegistry';

export interface ContainerSchema {
  // Additional reactive keys specific to containers can be declared by subclasses.
}

export interface ContainerProps {
  /** Optional layout description (can be { type: 'join', ... } etc.) */
  layout?: LayoutConfig | Layout;
  /** Children components already constructed via factories. */
  items?: Array<BaseComponent<any, any>>;
  /** Extra class names for the host */
  className?: string;
}

export class Container<
  Schema extends object = ContainerSchema,
  Props extends ContainerProps = ContainerProps
> extends Component<Schema, Props> {
  protected items: BaseComponent<any, any>[] = [];
  private _layout?: Layout;
  private _layoutScheduled = false;

  private _disabledSnapshots = new WeakMap<BaseComponent<any, any>, boolean>();
  private _disabledCascadeUnsub?: () => void;

  protected stateInit = {} as Record<string, any>;

  /**
   * Before mount:
   * - instantiate the layout (if provided)
   * - normalize incoming children and mount them off-DOM to inherit our state
   */
  protected override beforeMount(): void {
    this._layout = LayoutRegistry.create(this.props.layout);

    const incoming = this.props.items ?? [];
    this.items = Array.from(incoming);

    for (const child of this.items) {
      const staging = document.createElement('div');
      child.mount(staging, this.state());
      this.syncChildDisabled(child, this.state().disabled);
    }

    this._disabledCascadeUnsub = this.state().on(
      'disabled',
      (disabled: boolean) => this.cascadeDisabled(disabled),
      { immediate: true }
    );
  }

  protected override afterMount(): void {
    super.afterMount();
    this.applyLayoutNow();
  }

  /** view(): render child hosts within our host */
  protected override view() {
    return html`${this.items.map((c) => c.el())}`;
  }

  /** After render, reapply the layout. */
  protected override doRender(): void {
    super.doRender();
    this.applyLayoutNow();
  }

  /** Add a child component at runtime. */
  public add(child: BaseComponent<any, any>): this {
    this.items.push(child);
    const staging = document.createElement('div');
    child.mount(staging, this.state());
    this.syncChildDisabled(child, this.state().disabled);
    this.requestRender();
    this.requestLayout();
    return this;
  }

  /** Remove a child component at runtime. */
  public remove(child: BaseComponent<any, any>): this {
    const idx = this.items.indexOf(child);
    if (idx >= 0) {
      this.items.splice(idx, 1);
      child.unmount();
      this._disabledSnapshots.delete(child);
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

  private cascadeDisabled(disabled: boolean): void {
    for (const child of this.items) this.syncChildDisabled(child, disabled);
  }

  private syncChildDisabled(child: BaseComponent<any, any>, containerDisabled: boolean): void {
    const childState = child.state() as { disabled: boolean };
    if (containerDisabled) {
      if (!this._disabledSnapshots.has(child)) {
        this._disabledSnapshots.set(child, childState.disabled);
      }
      if (!childState.disabled) childState.disabled = true;
    } else if (this._disabledSnapshots.has(child)) {
      const previous = this._disabledSnapshots.get(child)!;
      this._disabledSnapshots.delete(child);
      if (childState.disabled !== previous) childState.disabled = previous;
    }
  }

  /** Cleanup: unmount children, dispose layout, then delegate to super. */
  public override unmount(): void {
    this._disabledCascadeUnsub?.();
    this._disabledCascadeUnsub = undefined;

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
    this._disabledSnapshots = new WeakMap();

    super.unmount();
  }
}

export function container<
  Schema extends object = ContainerSchema,
  Props extends ContainerProps = ContainerProps
>(cfg: ComponentConfig<Schema, Props> = {} as ComponentConfig<Schema, Props>): Container<Schema, Props> {
  return new Container<Schema, Props>(cfg);
}
