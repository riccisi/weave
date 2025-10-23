// src/ui/tokens.ts
export type FlyonColor =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'info'
    | 'success'
    | 'warning'
    | 'error';

export const FlyonColorClasses = {
    button(color: FlyonColor): string | null {
        const m: Record<FlyonColor, string | null> = {
            default: null,
            primary: 'btn-primary',
            secondary: 'btn-secondary',
            accent: 'btn-accent',
            info: 'btn-info',
            success: 'btn-success',
            warning: 'btn-warning',
            error: 'btn-error',
        };
        return m[color] ?? null;
    },

    alert(color: FlyonColor): string | null {
        const m: Record<FlyonColor, string | null> = {
            default: null,
            primary: 'alert-primary',
            secondary: 'alert-secondary',
            info: 'alert-info',
            success: 'alert-success',
            warning: 'alert-warning',
            error: 'alert-error',
            accent: null, // non sempre presente negli alert
        };
        return m[color] ?? null;
    },

    progress(color: FlyonColor): string | null {
        const m: Record<FlyonColor, string | null> = {
            default: null,
            primary: 'progress-primary',
            secondary: 'progress-secondary',
            accent: 'progress-accent',
            info: 'progress-info',
            success: 'progress-success',
            warning: 'progress-warning',
            error: 'progress-error',
        };
        return m[color] ?? null;
    },
} as const;
