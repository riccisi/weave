import { html } from 'uhtml';
import { Component, ComponentState, ComponentProps } from './Component';

export interface MarkupState extends ComponentState {
    // per ora nessuna chiave reattiva custom,
    // ereditiamo only hidden/disabled ecc.
}

export interface MarkupProps extends ComponentProps {
    tag?: string; // default "div"
    className?: string;
    render?: () => any;
}

export class Markup extends Component<MarkupState, MarkupProps> {
    static label = 'markup';

    protected initialState(): MarkupState {
        // ereditiamo le default del Component base
        return {
            ...super.initialState()
        } satisfies MarkupState;
    }

    protected hostTag(): string {
        // preferisci il tag passato, fallback a 'div'
        const t = this.props.tag;
        return typeof t === 'string' && t.trim() ? t.trim() : 'div';
    }

    protected view() {
        // sincronia className sull'host
        const classes: string[] = [];
        if (typeof this.props.className === 'string') {
            for (const c of this.props.className.split(/\s+/)) {
                if (c) classes.push(c);
            }
        }
        this.syncHostClasses(classes);

        // il contenuto interno lo otteniamo da props.render()
        const body = this.props.render ? this.props.render() : null;
        return html`${body}`;
    }
}

export function markup(cfg: Partial<MarkupState> & Partial<MarkupProps> = {}): Markup {
    return new Markup(cfg);
}