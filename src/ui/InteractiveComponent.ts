import { Component, type ComponentState, type ComponentProps } from './Component';

/**
 * Reactive state shared by interactive components.
 * Adds disabled-related switches on top of {@link ComponentState}.
 */
export interface InteractiveComponentState extends ComponentState {
  /** When true, the component should appear disabled and not respond to input. */
  disabled: boolean;
  /**
   * When true together with {@link disabled}, attempt to remove the component from the focus
   * and accessibility tree (via `inert`, `aria-disabled`, etc.).
   */
  disabledInert: boolean;
}

/**
 * Base class for interactive components (things that can be "disabled").
 *
 * @typeParam S - Reactive state contract. Must include {@link InteractiveComponentState}.
 * @typeParam P - Non-reactive props contract.
 */
export abstract class InteractiveComponent<
  S extends InteractiveComponentState = InteractiveComponentState,
  P extends ComponentProps = ComponentProps
> extends Component<S, P> {
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
      ...(super.initialState() as ComponentState),
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
   * Lifecycle hook ensuring disabled attributes are applied before the first render.
   * Interactive components call {@link applyDisabled} once the host is created so that
   * initial state/parent constraints are reflected immediately.
   */
  protected override beforeMount(): void {
    super.beforeMount();
    this.applyDisabled();
  }

  protected override onStateKeyChange(key: keyof S): void {
    super.onStateKeyChange(key);
    if (key === 'disabled' || key === 'disabledInert') {
      this.applyDisabled();
    }
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
