import {TextField, type TextFieldState} from './TextField';
import type {ComponentConfig} from '../Component';
import type {BaseInputProps, BaseInputState} from './BaseInput';
import { mergeSchemas } from '../schemaUtils';

export class EmailField extends TextField {
    protected override schema(): Record<string, any> {
        return mergeSchemas(super.schema(), {
            properties: {
                spellcheck: { type: ['boolean', 'null'], default: false }
            }
        });
    }

    protected override inputType(): string {
        return 'email';
    }

    protected override inputAttributes(): Record<string, any> {
        const base = super.inputAttributes();
        const p = this.props();
        return {
            ...base,
            inputmode: p.inputMode ?? 'email',
            autocomplete: p.autocomplete ?? 'email'
        };
    }

    protected override validate(v: string | null) {
        const baseResult = super.validate(v);
        if (baseResult && !baseResult.valid) return baseResult;
        if (!v) return baseResult;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(v)) {
            return {valid: false, message: 'Invalid email address'};
        }
        return {valid: true};
    }
}

export function emailfield(
    cfg: ComponentConfig<BaseInputState<string> & TextFieldState, BaseInputProps> = {}
): EmailField {
    return new EmailField(cfg);
}
