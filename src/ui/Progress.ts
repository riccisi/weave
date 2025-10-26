// src/ui/Progress.ts
import { html } from 'uhtml';
import {
  Component,
  type BuiltInComponentState,
  type ComponentConfig
} from './Component';
import { FlyonColor, FlyonColorClasses } from './tokens';

type Orientation = 'horizontal' | 'vertical';
type LabelMode = 'none' | 'inside' | 'end' | 'floating';

export interface ProgressState extends BuiltInComponentState {
  value: number | null;
  min: number;
  max: number;
  orientation: Orientation;
  color: FlyonColor;
  striped: boolean;
  animated: boolean;
  indeterminate: boolean;
  labelMode: LabelMode;
  labelText: string | null;
  widthClass: string | null;
  heightClass: string | null;
  thicknessClass: string | null;
}

export interface ProgressProps {
  ariaLabel?: string;
  className?: string;
}

export class Progress extends Component<ProgressState> {
  protected override initialState(): ProgressState {
    return {
      ...(super.initialState() as BuiltInComponentState),
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
      thicknessClass: null
    } satisfies ProgressState;
  }

  private pct(): number | null {
    const s = this.state();
    if (s.indeterminate || s.value == null) return null;
    const span = Math.max(1e-9, s.max - s.min);
    const raw = ((s.value - s.min) / span) * 100;
    return Math.min(100, Math.max(0, raw));
  }

  protected override view() {
    const s = this.state();

    const barContainer = new Set<string>(['progress']);
    if (s.orientation === 'vertical') barContainer.add('progress-vertical');
    else barContainer.add('progress-horizontal');

    if (s.orientation === 'horizontal') {
      if (s.widthClass) barContainer.add(s.widthClass);
    } else {
      if (s.heightClass) barContainer.add(s.heightClass);
    }
    if (s.thicknessClass) barContainer.add(s.thicknessClass);

    const bar = new Set<string>(['progress-bar']);
    const colorCls = FlyonColorClasses.progress(s.color);
    if (colorCls) bar.add(colorCls);
    if (s.striped) bar.add('progress-striped');
    if (s.animated) bar.add('progress-animated');
    if (s.indeterminate || s.value == null) bar.add('progress-indeterminate');

    const pct = this.pct();
    const barStyle =
      pct == null
        ? ''
        : s.orientation === 'horizontal'
          ? `width:${pct}%`
          : `height:${pct}%`;

    const ariaNow = pct == null ? undefined : String(Math.round(pct));
    const ariaLabel = (this.props as ProgressProps).ariaLabel ?? (pct == null ? 'Loading' : `${Math.round(pct)}% Progressbar`);

    const labelText = s.labelText ?? (pct == null ? '' : `${Math.round(pct)}%`);

    const hostClasses = this.hostClasses();
    if (s.labelMode === 'end') {
      hostClasses.add('flex');
      hostClasses.add('items-center');
      hostClasses.add('gap-3');
    } else if (s.labelMode === 'floating') {
      hostClasses.add('relative');
    }
    this.syncHostClasses(hostClasses);

    const barInner =
      s.labelMode === 'inside' && pct != null
        ? html`<div class=${[...bar].join(' ')} style=${barStyle}>
            <span class="font-normal">${labelText}</span>
          </div>`
        : html`<div class=${[...bar].join(' ')} style=${barStyle}></div>`;

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

    if (s.labelMode === 'end' && pct != null) {
      return html`${progressEl}<span class="text-sm tabular-nums">${labelText}</span>`;
    }

    if (s.labelMode === 'floating' && pct != null) {
      const floatStyle =
        s.orientation === 'horizontal'
          ? `position:absolute;left:${pct}%;transform:translateX(-50%);`
          : `position:absolute;bottom:${pct}%;transform:translateY(50%);`;
      return html`${progressEl}
        <span class="progress-label absolute start-0" style=${floatStyle}>${labelText}</span>`;
    }

    return html`${progressEl}`;
  }
}

export function progress(
  cfg: ComponentConfig<ProgressState, ProgressProps> = {}
): Progress {
  return new Progress(cfg);
}
