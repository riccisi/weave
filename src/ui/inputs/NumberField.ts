// src/ui/inputs/NumberField.ts
import { BaseInput } from './BaseInput';
import { ComponentRegistry } from '../Registry';

export interface NumberFieldState {
    min?: number | null;
    max?: number | null;
    step?: number | null;
}

export class NumberField extends BaseInput<number> {
    static wtype = 'numberfield';

    protected inputType(): string { return 'number'; }
    protected toDom(v: number | null): string { return v == null ? '' : String(v); }
    protected fromDom(raw: string): number | null {
        if (raw.trim() === '') return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
        // (in alternativa potresti restituire l’ultimo valido e marcare invalid)
    }

    protected validate(v: number | null) {
        const s = this.state() as any as NumberFieldState;
        if (this.state().required && v == null) return { valid: false, message: 'Required' };
        if (v == null) return { valid: true };
        if (s.min != null && v < s.min) return { valid: false, message: `Min ${s.min}` };
        if (s.max != null && v > s.max) return { valid: false, message: `Max ${s.max}` };
        return { valid: true };
    }
}

ComponentRegistry.registerClass(NumberField);
