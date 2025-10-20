import { html } from 'uhtml';
import { Component, StateInit } from './Component';
import { ComponentRegistry } from './Registry';

type FlyonColor =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'info'
    | 'success'
    | 'warning'
    | 'error';

type Orientation = 'horizontal' | 'vertical';
type LabelMode = 'none' | 'inside' | 'end' | 'floating';

export interface ProgressState {
    /** 0..100 by default; if null or indeterminate=true → barra indeterminata */
    value: number | null;
    /** Min e max per il calcolo della percentuale (aria e width/height) */
    min: number;
    max: number;

    /** Direzione della barra (default: horizontal) */
    orientation: Orientation;

    /** Colore semantico della barra (applicato su .progress-bar) */
    color: FlyonColor;

    /** Stile a strisce (progress-striped) */
    striped: boolean;
    /** Animazione per le strisce (richiede striped) */
    animated: boolean;
    /** Stato indeterminato (usa class progress-indeterminate) */
    indeterminate: boolean;

    /** Come mostrare l’etichetta */
    labelMode: LabelMode;
    /** Testo etichetta (se null viene calcolato come “{pct}%”) */
    labelText: string | null;

    /** Class utilitarie per dimensioni del contenitore (es. w-56 per horizontal, h-56 per vertical) */
    widthClass: string | null;   // usata se orientation = 'horizontal'
    heightClass: string | null;  // usata se orientation = 'vertical'
    /** Spessore barra: usa class Tailwind h-* (orizz) o w-* (vertical) sul contenitore */
    thicknessClass: string | null;

    /** Extra className lato props */
    // (NB: className non fa parte dello State, appartiene alle props flat)
}

export class Progress extends Component<ProgressState> {
    static wtype = 'progress';

    protected stateInit: StateInit = {
        value: 50,
        min: 0,
        max: 100,
        orientation: 'horizontal',
        color: 'primary',
        striped: false,
        animated: false,
        indeterminate: false,
        labelMode: 'none',
        labelText: null,
        widthClass: 'w-56',   // esempio come in docs
        heightClass: 'h-56',  // per vertical
        thicknessClass: null,
    };

    private pct(): number | null {
        const s = this.state();
        if (s.indeterminate || s.value == null) return null;
        const span = Math.max(1e-9, s.max - s.min);
        const raw = ((s.value - s.min) / span) * 100;
        return Math.min(100, Math.max(0, raw));
    }

    protected view() {
        const s = this.state();

        // contenitore: classi base + direzione + dimensioni
        const container = new Set<string>(['progress']);
        if (s.orientation === 'vertical') container.add('progress-vertical');
        else container.add('progress-horizontal'); // è la default nei docs, esplicitiamo

        // dimensioni
        if (s.orientation === 'horizontal') {
            if (s.widthClass) container.add(s.widthClass);
        } else {
            if (s.heightClass) container.add(s.heightClass);
        }
        if (s.thicknessClass) container.add(s.thicknessClass);

        // barra: classi base + colore + varianti
        const bar = new Set<string>(['progress-bar']);
        const COLOR: Record<FlyonColor, string | null> = {
            default: null,
            primary: 'progress-primary',
            secondary: 'progress-secondary',
            accent: 'progress-accent',
            info: 'progress-info',
            success: 'progress-success',
            warning: 'progress-warning',
            error: 'progress-error',
        };
        const colorClass = COLOR[s.color];
        if (colorClass) bar.add(colorClass);
        if (s.striped) bar.add('progress-striped');
        if (s.animated) bar.add('progress-animated');
        if (s.indeterminate || s.value == null) bar.add('progress-indeterminate');

        // stile dimensione della barra (width o height percentuale)
        const pct = this.pct();
        const barStyle =
            pct == null
                ? ''
                : (s.orientation === 'horizontal'
                    ? `width:${pct}%`
                    : `height:${pct}%`);

        // ARIA
        const ariaNow   = pct == null ? undefined : String(Math.round(pct));
        const ariaLabel =
            (this.props.ariaLabel as string | undefined)
            ?? (pct == null ? 'Loading' : `${Math.round(pct)}% Progressbar`);

        // class extra props
        const extra = typeof this.props.className === 'string' ? this.props.className : '';
        const containerClass = [...container].join(' ') + (extra ? ` ${extra}` : '');
        const barClass = [...bar].join(' ');

        // Label: calcolo testo se non fornito
        const labelText =
            s.labelText ?? (pct == null ? '' : `${Math.round(pct)}%`);

        // Template per barra + label inside
        const innerBar =
            s.labelMode === 'inside' && pct != null
                ? html`<div class=${barClass} style=${barStyle}><span class="font-normal">${labelText}</span></div>`
                : html`<div class=${barClass} style=${barStyle}></div>`;

        // Varianti: end/floating richiedono wrapper per label
        if (s.labelMode === 'end' && pct != null) {
            // progress + label a destra
            return html`
                <div class="flex items-center gap-3">
                    <div class=${containerClass}
                         role="progressbar"
                         aria-label=${ariaLabel}
                         aria-valuemin=${String(s.min)}
                         aria-valuemax=${String(s.max)}
                         aria-valuenow=${ariaNow}>
                        ${innerBar}
                    </div>
                    <span class="text-sm tabular-nums">${labelText}</span>
                </div>
            `;
        }

        if (s.labelMode === 'floating' && pct != null) {
            // wrapper relativo + label “progress-label” posizionata con left/bottom in %
            const floatStyle =
                s.orientation === 'horizontal'
                    ? `position:absolute;left:${pct}%;transform:translateX(-50%);`
                    : `position:absolute;bottom:${pct}%;transform:translateY(50%);`;
            const posClasses =
                s.orientation === 'horizontal'
                    ? 'progress-label absolute start-0'
                    : 'progress-label absolute start-0'; // manteniamo semantica base; pos via style
            return html`
        <div class="relative">
          <div class=${containerClass}
               role="progressbar"
               aria-label=${ariaLabel}
               aria-valuemin=${String(s.min)}
               aria-valuemax=${String(s.max)}
               aria-valuenow=${ariaNow}>
            ${innerBar}
          </div>
          <span class=${posClasses} style=${floatStyle}>${labelText}</span>
        </div>
      `;
        }

        // Default: nessuna label o inside già gestita
        return html`
      <div class=${containerClass}
           role="progressbar"
           aria-label=${ariaLabel}
           aria-valuemin=${String(s.min)}
           aria-valuemax=${String(s.max)}
           aria-valuenow=${ariaNow}>
        ${innerBar}
      </div>
    `;
    }
}

ComponentRegistry.registerClass(Progress);
