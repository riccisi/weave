import type { LayoutConfig } from './Layout';

export function vbox(opts: { gap?: number } = {}): LayoutConfig {
  return { type: 'vbox', gap: opts.gap ?? 8 } as LayoutConfig;
}

export function hbox(opts: { gap?: number } = {}): LayoutConfig {
  return { type: 'hbox', gap: opts.gap ?? 8 } as LayoutConfig;
}

export function joinLayout(opts: { orientation?: 'horizontal' | 'vertical'; className?: string; deepTarget?: boolean } = {}): LayoutConfig {
  return {
    type: 'join',
    orientation: opts.orientation ?? 'horizontal',
    className: opts.className,
    deepTarget: opts.deepTarget
  } as LayoutConfig;
}
