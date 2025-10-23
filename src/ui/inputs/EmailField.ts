import { TextField, type TextFieldState } from './TextField';
import { ComponentRegistry } from '../Registry';

export class EmailField extends TextField {
    static override wtype = 'emailfield';

    protected override extraStateInit(): TextFieldState {
        return {
            ...super.extraStateInit(),
            spellcheck: false,
        };
    }

    protected override inputType(): string { return 'email'; }

    protected override inputAttributes(): Record<string, any> {
        const base = super.inputAttributes();
        return {
            ...base,
            inputmode: this.props.inputMode ?? 'email',
            autocomplete: this.props.autocomplete ?? 'email',
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

ComponentRegistry.registerClass(EmailField);
