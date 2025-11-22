// Tenuto vivo intenzionalmente per il JIT di Tailwind v4.
// Importalo una volta in main.ts.
import tablerIcons from '@iconify-json/tabler/icons.json';

// Safelist base per le classi UI + icone Tabler (tutte) per supportare icon-* dinamiche.
const base = `
card card-body card-title card-actions card-image
card-compact card-side image-full glass border bg-base-100 shadow-md
card-xs card-sm card-md card-lg
size-4 size-5 size-6
status-success status-warning status-error
gap-0 gap-1 gap-2 gap-3 gap-4 gap-5 gap-6 gap-7 gap-8 gap-9 gap-10 gap-11 gap-12
grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 grid-cols-5 grid-cols-6
grid-cols-7 grid-cols-8 grid-cols-9 grid-cols-10 grid-cols-11 grid-cols-12
p-0 p-1 p-2 p-3 p-4
flex flex-row flex-col flex-wrap
items-start items-center items-end items-stretch
justify-start justify-center justify-end justify-between justify-around justify-evenly
`;

const tablerSafe = Object.keys((tablerIcons as any).icons || {})
    .map((k) => `icon-[tabler--${k}]`)
    .join(' ');

export const __tailwind_safelist__ = `${base} ${tablerSafe}`;
