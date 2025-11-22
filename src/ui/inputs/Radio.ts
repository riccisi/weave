// src/ui/inputs/Radio.ts
import {html, type Hole} from 'uhtml';

import type {ComponentConfig} from '../Component';
import {
    type BaseInputProps,
    type BaseInputState,
    type InputControlContext,
    type InputSize
} from './BaseInput';
import {ChoiceInput, type ChoiceState} from './ChoiceInput';

export type RadioColor =
    | 'default' | 'primary' | 'secondary' | 'accent'
    | 'info' | 'success' | 'warning' | 'error';

export type RadioVariant = 'default' | 'inset';

export interface RadioState extends ChoiceState {
    color: RadioColor;
    variant: RadioVariant;
}

const COLOR_CLASS: Record<RadioColor, string | null> = {
    default: null,
    primary: 'radio-primary',
    secondary: 'radio-secondary',
    accent: 'radio-accent',
    info: 'radio-info',
    success: 'radio-success',
    warning: 'radio-warning',
    error: 'radio-error'
};

const SIZE_CLASS: Partial<Record<InputSize, string | null>> = {
    xs: 'radio-xs',
    sm: 'radio-sm',
    md: null,
    lg: 'radio-lg',
    xl: 'radio-xl'
};

const VARIANT_CLASS: Record<RadioVariant, string | null> = {
    default: null,
    inset: 'radio-inset'
};

export class Radio extends ChoiceInput<RadioState> {
    protected override defaultHostClasses(): string[] {
        return [];
    }

    protected override extraInitialState(): RadioState {
        return {
            color: 'default',
            variant: 'default',
            labelPlacement: 'right'
        } satisfies RadioState;
    }

    protected override beforeMount(): void {
        super.beforeMount();
        const s = this.state();
        if (s.value === null) s.value = false;
    }

    protected override inputType(): string {
        return 'radio';
    }

    protected override toDom(v: boolean | null): string {
        return v ? 'on' : '';
    }

    protected override fromDom(raw: string): boolean | null {
        return raw === 'on';
    }

    protected override renderControl(ctx: InputControlContext): Hole {
        const s = this.state();
        const radioClasses = new Set<string>(['radio']);
        const sizeCls = SIZE_CLASS[s.size];
        if (sizeCls) radioClasses.add(sizeCls);
        const colorCls = COLOR_CLASS[s.color];
        if (colorCls) radioClasses.add(colorCls);
        const variantCls = VARIANT_CLASS[s.variant];
        if (variantCls) radioClasses.add(variantCls);
        if (s.valid === true && s.showValidState && s.validationEnabled !== false) radioClasses.add('is-valid');
        if (s.valid === false && s.validationEnabled !== false) radioClasses.add('is-invalid');
        const radioClass = Array.from(radioClasses).join(' ');

        return html`
            <input
                id=${ctx.id}
                class=${radioClass}
                type="radio"
                ?checked=${!!s.value}
                ?readonly=${s.readonly}
                ?required=${s.required}
                aria-invalid=${ctx.ariaInvalid}
                aria-required=${ctx.ariaRequired}
                aria-describedby=${ctx.ariaDescribedBy}
                oninput=${ctx.onInput}
                onchange=${ctx.onChange}
                onkeydown=${ctx.onKeyDown}
            />
        `;
    }

    protected override validate(v: boolean | null) {
        const s = this.state();
        if (s.required && !v) {
            return {valid: false, message: 'Required'};
        }
        return {valid: true};
    }
}

export function radio(
    cfg: ComponentConfig<BaseInputState<boolean> & RadioState, BaseInputProps> = {}
): Radio {
    return new Radio(cfg);
}
