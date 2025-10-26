import { TextField, type TextFieldState } from './TextField';
import type { ComponentConfig } from '../Component';
import type { BaseInputProps, BaseInputState } from './BaseInput';

export class EmailField extends TextField {
  protected override extraInitialState(): TextFieldState {
    return {
      ...super.extraInitialState(),
      spellcheck: false
    } satisfies TextFieldState;
  }

  protected override inputType(): string { return 'email'; }

  protected override inputAttributes(): Record<string, any> {
    const base = super.inputAttributes();
    return {
      ...base,
      inputmode: this.props.inputMode ?? 'email',
      autocomplete: this.props.autocomplete ?? 'email'
    };
  }

  protected override validate(v: string | null) {
    const baseResult = super.validate(v);
    if (baseResult && !baseResult.valid) return baseResult;
    if (!v) return baseResult;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(v)) {
      return { valid: false, message: 'Invalid email address' };
    }
    return { valid: true };
  }
}

export function emailfield(
  cfg: ComponentConfig<BaseInputState<string> & TextFieldState, BaseInputProps> = {}
): EmailField {
  return new EmailField(cfg);
}
