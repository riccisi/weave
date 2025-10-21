// src/ui/Progress.ts
import { html } from 'uhtml';
import { Component, StateInit } from './Component';
import { ComponentRegistry } from './Registry';
import { FlyonColor, FlyonColorClasses } from './tokens';

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

    /** Class utilitarie per dimensioni del contenitore della barra */
    widthClass: string | null;   // usata se orientation = 'horizontal'
    heightClass: string | null;  // usata se orientation = 'vertical'
    /** Spessore barra: Tailwind h-* (orizz) o w-* (vertical) sul contenitore della barra */
    thicknessClass: string | null;
}

/**
 * FlyonUI Progress
 * - Host = wrapper; la barra è sempre un `div.progress` interno con `role="progressbar"`.
 * - Classi/attributi host applicati in diff per non toccare classi esterne (es. join-item).
 * - Label: inside / end / floating come documentazione Flyon.
 */
export class Progress extends Component<ProgressState> {
    static wtype = 'progress';

    private _appliedHostClasses: Set<string> = new Set();

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
        widthClass: 'w-56',
        heightClass: 'h-56',
        thicknessClass: null,
    };

    /** Calcola la percentuale 0..100 (clamped) o null per indeterminate. */
    private pct(): number | null {
        const s = this.state();
        if (s.indeterminate || s.value == null) return null;
        const span = Math.max(1e-9, s.max - s.min);
        const raw = ((s.value - s.min) / span) * 100;
        return Math.min(100, Math.max(0, raw));
    }

    protected view() {
        const s = this.state();
        const host = this.el();

        // --- classi del contenitore della barra (NON l’host) --------------------
        const barContainer = new Set<string>(['progress']);
        if (s.orientation === 'vertical') barContainer.add('progress-vertical');
        else barContainer.add('progress-horizontal');

        if (s.orientation === 'horizontal') {
            if (s.widthClass) barContainer.add(s.widthClass);
        } else {
            if (s.heightClass) barContainer.add(s.heightClass);
        }
        if (s.thicknessClass) barContainer.add(s.thicknessClass);

        // --- classi della barra vera e propria ----------------------------------
        const bar = new Set<string>(['progress-bar']);
        const colorCls = FlyonColorClasses.progress(s.color);
        if (colorCls) bar.add(colorCls);
        if (s.striped) bar.add('progress-striped');
        if (s.animated) bar.add('progress-animated');
        if (s.indeterminate || s.value == null) bar.add('progress-indeterminate');

        // --- stile width/height in base all’orientamento ------------------------
        const pct = this.pct();
        const barStyle =
            pct == null
                ? ''
                : s.orientation === 'horizontal'
                    ? `width:${pct}%`
                    : `height:${pct}%`;

        // --- ARIA (sul div.progress) --------------------------------------------
        const ariaNow = pct == null ? undefined : String(Math.round(pct));
        const ariaLabel =
            (this.props.ariaLabel as string | undefined) ??
            (pct == null ? 'Loading' : `${Math.round(pct)}% Progressbar`);

        // --- label text ----------------------------------------------------------
        const labelText = s.labelText ?? (pct == null ? '' : `${Math.round(pct)}%`);

        // --- host classes (wrapper) in diff -------------------------------------
        const hostClasses = new Set<string>();
        // layout extra per label 'end' e 'floating'
        if (s.labelMode === 'end') {
            hostClasses.add('flex');
            hostClasses.add('items-center');
            hostClasses.add('gap-3');
        } else if (s.labelMode === 'floating') {
            hostClasses.add('relative');
        }
        // merge extra from props.className
        const extra = typeof this.props.className === 'string'
            ? this.props.className.split(/\s+/).filter(Boolean)
            : [];
        for (const e of extra) hostClasses.add(e);

        // apply diff (non tocchiamo classi esterne non applicate da noi)
        for (const c of this._appliedHostClasses) host.classList.remove(c);
        for (const c of hostClasses) host.classList.add(c);
        this._appliedHostClasses = hostClasses;

        // --- inner DOM -----------------------------------------------------------
        // barra: con label inside (se richiesta)
        const barInner =
            s.labelMode === 'inside' && pct != null
                ? html`<div class=${[...bar].join(' ')} style=${barStyle}>
                <span class="font-normal">${labelText}</span>
              </div>`
                : html`<div class=${[...bar].join(' ')} style=${barStyle}></div>`;

        // contenitore barra con ARIA
        const progressEl = html`
      <div class=${[...barContainer].join(' ')}
           role="progressbar"
           aria-label=${ariaLabel}
           aria-valuemin=${String(s.min)}
           aria-valuemax=${String(s.max)}
           aria-valuenow=${ariaNow}>
        ${barInner}
      </div>
    `;

        // label modes: end | floating | none/inside
        if (s.labelMode === 'end' && pct != null) {
            return html`${progressEl}<span class="text-sm tabular-nums">${labelText}</span>`;
        }

        if (s.labelMode === 'floating' && pct != null) {
            const floatStyle =
                s.orientation === 'horizontal'
                    ? `position:absolute;left:${pct}%;transform:translateX(-50%);`
                    : `position:absolute;bottom:${pct}%;transform:translateY(50%);`;
            // posizionamento base (left/start allineato; stile rifinisce)
            return html`${progressEl}
        <span class="progress-label absolute start-0" style=${floatStyle}>${labelText}</span>`;
        }

        // default: none / inside
        return html`${progressEl}`;
    }
}

ComponentRegistry.registerClass(Progress);
