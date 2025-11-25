// src/ui/inputs/TextField.ts
import {BaseInput, type BaseInputProps, type BaseInputState} from './BaseInput';
import type {ComponentConfig}from '../Component';
import { mergeSchemas } from '../schemaUtils';

export interface TextFieldState {
    minLength: number | null;
    maxLength: number | null;
    pattern: string | null;
    spellcheck: boolean | null;
}

export class TextField extends BaseInput<string, TextFieldState> {
    protected override schema(): Record<string, any> {
        return mergeSchemas(super.schema(), {
            properties: {
                minLength: { type: ['number', 'null'], default: null },
                maxLength: { type: ['number', 'null'], default: null },
                pattern: { type: ['string', 'null'], default: null },
                spellcheck: { type: ['boolean', 'null'], default: null }
            }
        });
    }

    protected inputType(): string {
        return 'text';
    }

    protected toDom(v: string | null): string {
        return v ?? '';
    }

    protected fromDom(raw: string): string | null {
        return raw;
    }

    protected override inputAttributes(): Record<string, any> {
        const s = this.state();
        return {
            minlength: s.minLength ?? undefined,
            maxlength: s.maxLength ?? undefined,
            pattern: s.pattern ?? undefined,
            spellcheck: typeof s.spellcheck === 'boolean' ? String(s.spellcheck) : undefined
        };
    }

    protected validate(v: string | null) {
        const s = this.state();
        if (s.required && (!v || v.length === 0)) {
            return {valid: false, message: 'Required'};
        }
        if (!v) return {valid: true};
        if (s.minLength != null && v.length < s.minLength) {
            return {valid: false, message: `Min ${s.minLength} characters`};
        }
        if (s.maxLength != null && v.length > s.maxLength) {
            return {valid: false, message: `Max ${s.maxLength} characters`};
        }
        if (s.pattern) {
            try {
                const re = new RegExp(s.pattern);
                if (!re.test(v)) {
                    return {valid: false, message: 'Invalid format'};
                }
            } catch {
                // invalid pattern -> ignore custom validation
            }
        }
        return {valid: true};
    }
}

export function textfield(
    cfg: ComponentConfig<BaseInputState<string> & TextFieldState, BaseInputProps> = {}
): TextField {
    return new TextField(cfg);
}
