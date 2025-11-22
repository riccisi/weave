// src/ui/inputs/Checkbox.ts
import {html, type Hole} from 'uhtml';

import type {ComponentConfig} from '../Component';
import {
    type BaseInputProps,
    type BaseInputState,
    type InputControlContext,
    type InputSize
} from './BaseInput';
import {ChoiceInput, type ChoiceState} from './ChoiceInput';

type CheckboxColor =
    | 'default' | 'primary' | 'secondary' | 'accent'
    | 'info' | 'success' | 'warning' | 'error';

type CheckboxShape = 'square' | 'circle';

export interface CheckboxState extends ChoiceState {
    color: CheckboxColor;
    shape: CheckboxShape;
    bordered: boolean;
    indeterminate: boolean;
}

const COLOR_CLASS: Record<CheckboxColor, string | null> = {
    default: null,
    primary: 'checkbox-primary',
    secondary: 'checkbox-secondary',
    accent: 'checkbox-accent',
    info: 'checkbox-info',
    success: 'checkbox-success',
    warning: 'checkbox-warning',
    error: 'checkbox-error'
};

const SIZE_CLASS: Partial<Record<InputSize, string | null>> = {
    xs: 'checkbox-xs',
    sm: 'checkbox-sm',
    md: null,
    lg: 'checkbox-lg',
    xl: 'checkbox-xl'
};

export class Checkbox extends ChoiceInput<CheckboxState> {
    protected override defaultHostClasses(): string[] {
        return [];
    }

    protected override extraInitialState(): CheckboxState {
        return {
            color: 'default',
            shape: 'square',
            bordered: false,
            labelPlacement: 'right',
            indeterminate: false
        } satisfies CheckboxState;
    }

    protected override beforeMount(): void {
        super.beforeMount();
        const s = this.state();
        if (s.value === null) s.value = false;
    }

    protected override inputType(): string {
        return 'checkbox';
    }

    protected override toDom(v: boolean | null): string {
        return v ? 'on' : '';
    }

    protected override fromDom(raw: string): boolean | null {
        return raw === 'on';
    }

    protected override updateFromInput(input: HTMLInputElement): void {
        const next = !!input.checked;
        const s = this.state();
        if (s.indeterminate && input.indeterminate) {
            input.indeterminate = false;
        }
        s.indeterminate = input.indeterminate && !next;
        this.commitValue(next);
    }

    protected override renderControl(ctx: InputControlContext): Hole {
        const s = this.state();
        const checkboxClasses = new Set<string>(['checkbox']);
        const sizeCls = SIZE_CLASS[s.size];
        if (sizeCls) checkboxClasses.add(sizeCls);
        const colorCls = COLOR_CLASS[s.color];
        if (colorCls) checkboxClasses.add(colorCls);
        if (s.shape === 'circle') checkboxClasses.add('checkbox-circle');
        if (s.bordered) checkboxClasses.add('checkbox-bordered');
        if (s.valid === true && s.showValidState && s.validationEnabled !== false) checkboxClasses.add('is-valid');
        if (s.valid === false && s.validationEnabled !== false) checkboxClasses.add('is-invalid');
        const checkboxClass = Array.from(checkboxClasses).join(' ');

        return html`
            <input
                id=${ctx.id}
                class=${checkboxClass}
                type="checkbox"
                ?checked=${!!s.value}
                .indeterminate=${!!s.indeterminate && !s.value}
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

export function checkbox(
    cfg: ComponentConfig<BaseInputState<boolean> & CheckboxState, BaseInputProps> = {}
): Checkbox {
    return new Checkbox(cfg);
}
