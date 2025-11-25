import {BaseInput, type BaseInputProps, type BaseInputState} from './BaseInput';
import type {ComponentConfig}from '../Component';
import { mergeSchemas } from '../schemaUtils';

export interface DateFieldState {
    min: string | null;
    max: string | null;
}

export class DateField extends BaseInput<string, DateFieldState> {
    protected override schema(): Record<string, any> {
        return mergeSchemas(super.schema(), {
            properties: {
                min: { type: ['string', 'null'], default: null },
                max: { type: ['string', 'null'], default: null }
            }
        });
    }

    protected inputType(): string {
        return 'date';
    }

    protected toDom(v: string | null): string {
        return v ?? '';
    }

    protected fromDom(raw: string): string | null {
        const trimmed = raw.trim();
        return trimmed.length ? trimmed : null;
    }

    protected override inputAttributes(): Record<string, any> {
        const s = this.state();
        return {
            min: s.min ?? undefined,
            max: s.max ?? undefined
        };
    }

    protected validate(v: string | null) {
        const s = this.state();
        if (s.required && (!v || !v.length)) {
            return {valid: false, message: 'Required'};
        }
        if (!v) return {valid: true};

        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(v)) {
            return {valid: false, message: 'Invalid date'};
        }
        if (s.min && v < s.min) {
            return {valid: false, message: `Date must be on or after ${s.min}`};
        }
        if (s.max && v > s.max) {
            return {valid: false, message: `Date must be on or before ${s.max}`};
        }
        return {valid: true};
    }
}

export function datefield(
    cfg: ComponentConfig<BaseInputState<string> & DateFieldState, BaseInputProps> = {}
): DateField {
    return new DateField(cfg);
}
