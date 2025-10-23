import { TextField, type TextFieldState } from './TextField';
import { ComponentRegistry } from '../Registry';

export class PasswordField extends TextField {
    static override wtype = 'passwordfield';

    protected override extraStateInit(): TextFieldState {
        return {
            ...super.extraStateInit(),
            spellcheck: false,
        };
    }

    protected override inputType(): string { return 'password'; }

    protected override inputAttributes(): Record<string, any> {
        const base = super.inputAttributes();
        return {
            ...base,
            autocomplete: this.props.autocomplete ?? 'current-password',
        };
    }
}

ComponentRegistry.registerClass(PasswordField);
