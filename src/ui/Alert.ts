// src/ui/Alert.ts
import { html } from 'uhtml';
import { Component, type ComponentState, type ComponentConfig } from './Component';
import type { ComponentProps } from './types';
import { Button } from './Button';
import { FlyonColor, FlyonColorClasses } from './tokens';

export type Variant = 'solid' | 'soft' | 'outline';

/**
 * Reactive state backing the {@link Alert} component.
 */
export interface AlertState extends ComponentState {
  /** Visual variant controlling background and borders. */
  variant: Variant;
  /** Semantic color to pick FlyonUI classes. */
  color: FlyonColor;
  /** Optional heading text. */
  title: string | null;
  /** Optional body copy. */
  message: string | null;
  /** Optional bullet list rendered under the message. */
  list: string[] | null;
  /** Optional icon class placed at the start. */
  icon: string | null;
  /** Whether the alert can be dismissed. */
  dismissible: boolean;
  /** Accessible label for the dismiss control. */
  closeLabel: string;
  /** Enable responsive layout adjustments for complex alerts. */
  responsive: boolean;
}

/**
 * Non-reactive configuration for {@link Alert}.
 */
export interface AlertProps extends ComponentProps {
  /** Action buttons rendered inline with the alert content. */
  actions?: Button[];
  /** Callback fired when the dismiss button is activated. */
  onDismiss?: (cmp: Alert, ev: MouseEvent) => void;
}

/**
 * Visual alert component capable of rendering icons, messages, lists and actions.
 */
export class Alert extends Component<AlertState, AlertProps> {
  private _buttons: Button[] = [];

  protected override initialState(): AlertState {
    return {
      ...(super.initialState() as ComponentState),
      variant: 'solid',
      color: 'default',
      title: null,
      message: 'A quick alert conveying key information or prompting action within a system.',
      list: null,
      icon: null,
      dismissible: false,
      closeLabel: 'Close',
      responsive: false
    } satisfies AlertState;
  }

  protected override beforeMount(): void {
    super.beforeMount();

    const actions = this.props.actions ?? [];
    this._buttons = Array.from(actions);

    for (const btn of this._buttons) {
      const staging = document.createElement('div');
      btn.mount(staging, this.state());
    }
  }

  protected override beforeUnmount(): void {
    for (const b of this._buttons) b.unmount();
    this._buttons = [];
    super.beforeUnmount();
  }

  protected override view() {
    const s = this.state();
    const host = this.el();

    const classes = this.hostClasses('alert');

    if (s.variant === 'soft') classes.add('alert-soft');
    else if (s.variant === 'outline') classes.add('alert-outline');

    const colorCls = FlyonColorClasses.alert(s.color);
    if (colorCls) classes.add(colorCls);

    const needsWrap = s.icon || this._buttons.length || s.title || s.list || s.responsive;
    if (needsWrap && s.responsive) {
      classes.add('max-sm:flex-col');
      classes.add('max-sm:items-center');
      classes.add('flex');
      classes.add('items-start');
      classes.add('gap-4');
    }

    if (s.dismissible) {
      classes.add('transition');
      classes.add('duration-300');
      classes.add('ease-in-out');
      classes.add('removing:opacity-0');
      classes.add('removing:translate-x-5');
    }

    this.syncHostClasses(classes);

    host.setAttribute('role', 'alert');

    const iconEl = s.icon ? html`<span class=${s.icon}></span>` : null;

    const titleEl = s.title ? html`<h5 class="text-lg font-semibold">${s.title}</h5>` : null;
    const messageEl = s.message && !s.list ? html`<p>${s.message}</p>` : null;
    const listEl = s.list?.length
      ? html`<ul class="mt-1.5 list-inside list-disc">${s.list.map((li) => html`<li>${li}</li>`)}</ul>`
      : null;

    const textCol = (titleEl || listEl)
      ? html`<div class="flex flex-col gap-1">${titleEl} ${messageEl} ${listEl}</div>`
      : html`${messageEl}`;

    const actionsEl = this._buttons.length
      ? html`<div class="mt-4 flex gap-2">${this._buttons.map((b) => b.el())}</div>`
      : null;

    const closeBtn = s.dismissible ? html`
      <button
        class="ms-auto cursor-pointer leading-none"
        aria-label=${s.closeLabel}
        onclick=${(ev: MouseEvent) => {
          this.props.onDismiss?.(this, ev);
          this.requestRemove();
        }}
      >
        <span class="icon-[tabler--x] size-5"></span>
      </button>
    ` : null;

    return html`${iconEl} ${textCol} ${actionsEl} ${closeBtn}`;
  }
}

export function alert(
  cfg: ComponentConfig<AlertState, AlertProps> = {}
): Alert {
  return new Alert(cfg);
}
