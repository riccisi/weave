// src/ui/inputs/TextField.ts
import { BaseInput } from './BaseInput';
import { ComponentRegistry } from '../Registry';

export interface TextFieldState {} // per future regole specifiche

export class TextField extends BaseInput<string> {
    static wtype = 'textfield';

    protected inputType(): string { return 'text'; }
    protected toDom(v: string | null): string { return v ?? ''; }
    protected fromDom(raw: string): string | null { return raw; }

    // Esempio opzionale:
    // protected validate(v: string | null) {
    //   if (this.state().required && (!v || !v.trim())) return { valid: false, message: 'Required' };
    //   return { valid: true };
    // }
}

ComponentRegistry.registerClass(TextField);
