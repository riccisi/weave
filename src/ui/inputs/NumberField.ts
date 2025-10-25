// src/ui/inputs/NumberField.ts
import { BaseInput, type BaseInputProps, type BaseInputState } from './BaseInput';
import type { ComponentConfig } from '../Component';

export interface NumberFieldState {
  min?: number | null;
  max?: number | null;
  step?: number | null;
}

export class NumberField extends BaseInput<number, NumberFieldState> {
  protected override extraStateInit(): NumberFieldState {
    return {
      min: null,
      max: null,
      step: null
    } satisfies NumberFieldState;
  }

  protected inputType(): string { return 'number'; }
  protected toDom(v: number | null): string { return v == null ? '' : String(v); }
  protected fromDom(raw: string): number | null {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  protected override inputAttributes(): Record<string, any> {
    const s = this.state();
    return {
      min: s.min ?? undefined,
      max: s.max ?? undefined,
      step: s.step ?? undefined,
      inputmode: this.props.inputMode ?? 'decimal'
    };
  }

  protected validate(v: number | null) {
    const s = this.state();
    if (this.state().required && v == null) return { valid: false, message: 'Required' };
    if (v == null) return { valid: true };
    if (s.min != null && v < s.min) return { valid: false, message: `Min ${s.min}` };
    if (s.max != null && v > s.max) return { valid: false, message: `Max ${s.max}` };
    return { valid: true };
  }
}

export function numberfield(
  cfg: ComponentConfig<BaseInputState<number> & NumberFieldState, BaseInputProps> = {}
): NumberField {
  return new NumberField(cfg);
}
