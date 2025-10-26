import { Component, type BuiltInComponentState } from './Component';

export interface InteractiveState extends BuiltInComponentState {
  /** If true, the component considers itself disabled (local business logic). */
  disabled: boolean;
  /** If true, a disabled component should also become inert for focus/screen readers. */
  disabledInert: boolean;
}

/**
 * Base class for interactive components (things that can be "disabled").
 * It extends Component and adds a "disabled" layer with parent-forcing.
 */
export abstract class InteractiveComponent<
  S extends InteractiveState = InteractiveState
> extends Component<S> {
  /** Tracks whether an ancestor container is forcing this component disabled. */
  private _forcedDisabledFromAncestor = false;

  /**
   * Last effective computed disabled (parent force OR local state.disabled).
   * Exposed to subclasses (e.g. Button) to style/attr the host accordingly.
   */
  protected _lastEffectiveDisabled = false;

  /**
   * initialState() here merges Component.initialState() with disabled flags.
   * Subclasses MUST call super.initialState() and then add their own defaults.
   */
  protected override initialState(): S {
    return {
      ...(super.initialState() as BuiltInComponentState),
      disabled: false,
      disabledInert: false
    } as S;
  }

  /**
   * Called by parent containers to force-disable (or release) this component.
   * Does NOT mutate the component's own state().disabled.
   */
  public setDisabledFromParent(flag: boolean): void {
    this._forcedDisabledFromAncestor = flag;
    this.applyDisabled();
  }

  /**
   * Computes the effective disabled state and applies generic ARIA/inert attributes.
   * Subclasses (like Button) will override this, call super.applyDisabled(),
   * and then also update visual classes / native attributes such as [disabled].
   */
  protected applyDisabled(): void {
    const host = this.el();
    if (!host) return;

    const st = this.state();
    const effective = this._forcedDisabledFromAncestor || st.disabled;
    this._lastEffectiveDisabled = effective;

    if (effective) {
      host.setAttribute('aria-disabled', 'true');
      if (st.disabledInert) host.setAttribute('inert', '');
    } else {
      host.removeAttribute('aria-disabled');
      host.removeAttribute('inert');
    }
  }

  /**
   * After mount, InteractiveComponent:
   * - calls super.afterMount()
   * - subscribes to its own disabled / disabledInert fields
   *   to keep DOM attributes/classes in sync.
   */
  protected override afterMount(): void {
    super.afterMount();

    const st = this.state();
    this._unsubs.push(
      st.on('disabled', () => this.applyDisabled(), { immediate: true })
    );
    this._unsubs.push(
      st.on('disabledInert', () => this.applyDisabled(), { immediate: false })
    );
  }

  /**
   * requestRender() override:
   * same coalescing logic, but after rendering we must apply both visibility and disabled state.
   */
  protected override requestRender(): void {
    if (this._renderQueued) return;
    this._renderQueued = true;
    queueMicrotask(() => {
      this._renderQueued = false;
      this.doRender();
      this.applyHidden();
      this.applyDisabled();
    });
  }
}
