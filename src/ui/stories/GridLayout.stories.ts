import type {Meta, StoryObj} from '@storybook/html';
import {container} from '../Container';
import {button} from '../Button';
import {gridLayout} from '../layouts/GridLayout';

/**
 * Helper to mount a Container configured with a grid layout,
 * for Storybook rendering.
 */
function renderContainer(cfg: Parameters<typeof container>[0]) {
    const root = document.createElement('div');
    const c = container(cfg);
    c.mount(root);
    return root;
}

const meta: Meta = {
    title: 'Layout/GridLayout',
};
export default meta;

type Story = StoryObj;

/**
 * 1. Simple 3-column equal grid with uniform gap.
 *    Children auto-flow into columns.
 */
export const ThreeColsGap: Story = {
    render: () =>
        renderContainer({
            layout: gridLayout({
                columns: 'repeat(3, 1fr)',
                gap: '0.75rem', // 12px-ish
            }),
            className: 'p-4 bg-base-200 rounded-xl shadow-md',
            items: [
                button({text: 'A'}),
                button({text: 'B'}),
                button({text: 'C'}),
                button({text: 'D'}),
                button({text: 'E'}),
                button({text: 'F'}),
            ],
        }),
};

/**
 * 2. Dashboard-like layout:
 *    - Explicit row/col templates
 *    - Per-child gridColumn / gridRow to "span" areas
 */
export const DashboardLikeSpans: Story = {
    render: () =>
        renderContainer({
            layout: gridLayout({
                columns: 'repeat(4, 1fr)',
                rows: '150px 150px',
                gap: '1rem',
            }),
            className: 'p-4 bg-base-200 rounded-xl shadow-md',
            items: [
                button({
                    text: 'Wide Card',
                    gridColumn: '1 / span 2', // spans two columns
                    gridRow: '1 / span 2',    // spans two rows
                    className: 'h-full w-full',
                }),
                button({
                    text: 'Top Right 1',
                    gridColumn: '3 / 4',
                    gridRow: '1 / 2',
                    className: 'h-full w-full',
                }),
                button({
                    text: 'Top Right 2',
                    gridColumn: '4 / 5',
                    gridRow: '1 / 2',
                    className: 'h-full w-full',
                }),
                button({
                    text: 'Bottom Right',
                    gridColumn: '3 / 5', // spans col 3..4
                    gridRow: '2 / 3',
                    className: 'h-full w-full',
                }),
            ],
        }),
};

/**
 * 3. Auto-fit columns: responsive card grid.
 *    columns uses minmax() so tiles wrap automatically as viewport shrinks.
 *    defaultItem.placeSelf = 'stretch' makes children expand to fill cell.
 */
export const AutoFitCards: Story = {
    render: () =>
        renderContainer({
            layout: gridLayout({
                columns: 'repeat(auto-fit, minmax(12rem, 1fr))',
                gap: '1rem',
                defaultItem: {
                    placeSelf: 'stretch',
                },
            }),
            className: 'p-4 bg-base-200 rounded-xl shadow-md',
            items: [
                button({text: 'Card 1', className: 'h-24 w-full'}),
                button({text: 'Card 2', className: 'h-24 w-full'}),
                button({text: 'Card 3', className: 'h-24 w-full'}),
                button({text: 'Card 4', className: 'h-24 w-full'}),
                button({text: 'Card 5', className: 'h-24 w-full'}),
                button({text: 'Card 6', className: 'h-24 w-full'}),
            ],
        }),
};

/**
 * 4. Asymmetric row/col gaps + per-item placeSelf override.
 *    rowGap != colGap, plus one item centered via placeSelf.
 */
export const MixedGapsAndPlaceSelf: Story = {
    render: () =>
        renderContainer({
            layout: gridLayout({
                columns: 'repeat(2, 1fr)',
                rowGap: '2rem',
                colGap: '0.5rem',
                alignItems: 'stretch',
                justifyItems: 'stretch',
                defaultItem: {
                    placeSelf: 'stretch',
                },
            }),
            className: 'p-4 bg-base-200 rounded-xl shadow-md max-w-xl',
            items: [
                button({
                    text: 'Tall',
                    className: 'h-32 w-full',
                }),
                button({
                    text: 'Centered',
                    placeSelf: 'center',
                    className: 'h-12 w-24',
                }),
                button({
                    text: 'Full Width',
                    gridColumn: '1 / span 2', // take both columns of next row
                    className: 'w-full h-16',
                }),
                button({
                    text: 'Bottom Left',
                    className: 'h-12 w-full',
                }),
            ],
        }),
};

/**
 * 5. Alignment demo:
 *    - alignItems / justifyItems on the grid container
 *    - some smaller buttons so you can see positioning inside cells
 */
export const AlignmentDemo: Story = {
    render: () =>
        renderContainer({
            layout: gridLayout({
                columns: 'repeat(3, 100px)',
                rows: 'repeat(2, 100px)',
                gap: '0.5rem',
                alignItems: 'center',   // vertical alignment inside each cell
                justifyItems: 'center', // horizontal alignment inside each cell
            }),
            className: 'p-4 bg-base-200 rounded-xl shadow-md inline-block',
            items: [
                button({text: 'A', className: 'h-8 w-8 text-xs'}),
                button({text: 'B', className: 'h-8 w-12 text-xs'}),
                button({text: 'C', className: 'h-8 w-16 text-xs'}),
                button({text: 'D', className: 'h-8 w-8 text-xs'}),
                button({text: 'E', className: 'h-8 w-12 text-xs'}),
                button({text: 'F', className: 'h-8 w-16 text-xs'}),
            ],
        }),
};
