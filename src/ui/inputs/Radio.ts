// src/ui/inputs/Radio.ts
import { html } from 'uhtml';

import { BaseInput, type BaseInputProps, type BaseInputState, type InputSize, type LabelMode } from './BaseInput';
import type { ComponentConfig } from '../Component';

export type RadioColor =
  | 'default' | 'primary' | 'secondary' | 'accent'
  | 'info' | 'success' | 'warning' | 'error';

export type RadioVariant = 'default' | 'inset';

export type LabelPlacement = 'left' | 'right';

export interface RadioState {
  color: RadioColor;
  variant: RadioVariant;
  labelPlacement: LabelPlacement;
}

const COLOR_CLASS: Record<RadioColor, string | null> = {
  default: null,
  primary: 'radio-primary',
  secondary: 'radio-secondary',
  accent: 'radio-accent',
  info: 'radio-info',
  success: 'radio-success',
  warning: 'radio-warning',
  error: 'radio-error'
};

const SIZE_CLASS: Partial<Record<InputSize, string | null>> = {
  xs: 'radio-xs',
  sm: 'radio-sm',
  md: null,
  lg: 'radio-lg',
  xl: 'radio-xl'
};

const VARIANT_CLASS: Record<RadioVariant, string | null> = {
  default: null,
  inset: 'radio-inset'
};

const LABEL_MODE_TO_PLACEMENT: Record<LabelMode, LabelPlacement> = {
  none: 'right',
  inline: 'right',
  floating: 'right'
};

export class Radio extends BaseInput<boolean, RadioState> {
  protected override defaultHostClasses(): string[] { return []; }

  protected override extraInitialState(): RadioState {
    return {
      color: 'default',
      variant: 'default',
      labelPlacement: 'right'
    } satisfies RadioState;
  }

  protected override beforeMount(): void {
    super.beforeMount();
    const s = this.state();
    if (s.value === null) s.value = false;
  }

  protected override inputType(): string { return 'radio'; }
  protected override toDom(v: boolean | null): string { return v ? 'on' : ''; }
  protected override fromDom(raw: string): boolean | null { return raw === 'on'; }

  protected override view() {
    const s = this.state();
    this.syncHostClasses(this.hostClassTokens('flex', 'items-center', 'gap-1'));

    const radioClasses = new Set<string>(['radio']);
    const sizeCls = SIZE_CLASS[s.size];
    if (sizeCls) radioClasses.add(sizeCls);
    const colorCls = COLOR_CLASS[s.color];
    if (colorCls) radioClasses.add(colorCls);
    const variantCls = VARIANT_CLASS[s.variant];
    if (variantCls) radioClasses.add(variantCls);
    if (s.valid === true) radioClasses.add('is-valid');
    if (s.valid === false) radioClasses.add('is-invalid');
    const radioClass = Array.from(radioClasses).join(' ');

    const ariaInvalid = s.valid === false ? 'true' : undefined;
    const ariaRequired = s.required ? 'true' : undefined;
    const inputId = this.id();
    const helperId = this.subId('help');
    const helperContent = this.helperContent();
    const ariaDescribedBy = helperContent ? helperId : undefined;

    this._pendingInputAttrs = this.buildInputAttributes();

    const updateFrom = (input: HTMLInputElement) => {
      const next = !!input.checked;
      this.commitValue(next);
    };

    const onInput = (ev: Event) => {
      const target = ev.target as HTMLInputElement | null;
      if (!target) return;
      updateFrom(target);
      this.props.onInput?.(this, ev);
    };

    const onChange = (ev: Event) => {
      const target = ev.target as HTMLInputElement | null;
      if (!target) return;
      updateFrom(target);
      this.props.onChange?.(this, ev);
    };

    const effectivePlacement = s.labelPlacement || LABEL_MODE_TO_PLACEMENT[s.labelMode];
    const showLabel = s.label && s.labelMode !== 'none';
    const labelClasses = ['label-text', 'cursor-pointer'];
    if (s.size === 'xs') labelClasses.push('text-xs');
    else if (s.size === 'sm') labelClasses.push('text-sm');
    else if (s.size === 'lg' || s.size === 'xl') labelClasses.push('text-lg');
    else labelClasses.push('text-base');
    const renderLabel = () => showLabel
      ? html`<label class=${labelClasses.join(' ')} for=${inputId}>${s.label}</label>`
      : null;
    const helper = helperContent
      ? html`<div id=${helperId} class="mt-1 text-xs opacity-80">${helperContent}</div>`
      : null;

    return html`
      ${effectivePlacement === 'left' ? renderLabel() : null}
      <input
        id=${inputId}
        class=${radioClass}
        type="radio"
        ?checked=${!!s.value}
        ?readonly=${s.readonly}
        ?required=${s.required}
        aria-invalid=${ariaInvalid}
        aria-required=${ariaRequired}
        aria-describedby=${ariaDescribedBy}
        oninput=${onInput}
        onchange=${onChange}
      />
      ${effectivePlacement === 'right' ? renderLabel() : null}
      ${helper}
    `;
  }

  protected override validate(v: boolean | null) {
    const s = this.state();
    if (s.required && !v) {
      return { valid: false, message: 'Required' };
    }
    return { valid: true };
  }
}

export function radio(
  cfg: ComponentConfig<BaseInputState<boolean> & RadioState, BaseInputProps> = {}
): Radio {
  return new Radio(cfg);
}
