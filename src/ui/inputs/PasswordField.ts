import {TextField, type TextFieldState} from './TextField';
import type {ComponentConfig} from '../Component';
import type {BaseInputProps, BaseInputState}from './BaseInput';
import { mergeSchemas } from '../schemaUtils';

export class PasswordField extends TextField {
    protected override schema(): Record<string, any> {
        return mergeSchemas(super.schema(), {
            properties: {
                spellcheck: { type: ['boolean', 'null'], default: false }
            }
        });
    }

    protected override inputType(): string {
        return 'password';
    }

    protected override inputAttributes(): Record<string, any> {
        const base = super.inputAttributes();
        const p = this.props();
        return {
            ...base,
            autocomplete: p.autocomplete ?? 'current-password'
        };
    }
}

export function passwordfield(
    cfg: ComponentConfig<BaseInputState<string> & TextFieldState, BaseInputProps> = {}
): PasswordField {
    return new PasswordField(cfg);
}
