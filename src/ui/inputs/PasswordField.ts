import { TextField, type TextFieldState } from './TextField';
import type { ComponentConfig } from '../Component';
import type { BaseInputProps, BaseInputState } from './BaseInput';

export class PasswordField extends TextField {
  protected override extraStateInit(): TextFieldState {
    return {
      ...super.extraStateInit(),
      spellcheck: false
    } satisfies TextFieldState;
  }

  protected override inputType(): string { return 'password'; }

  protected override inputAttributes(): Record<string, any> {
    const base = super.inputAttributes();
    return {
      ...base,
      autocomplete: this.props.autocomplete ?? 'current-password'
    };
  }
}

export function passwordfield(
  cfg: ComponentConfig<BaseInputState<string> & TextFieldState, BaseInputProps> = {}
): PasswordField {
  return new PasswordField(cfg);
}
