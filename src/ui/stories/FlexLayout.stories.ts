import type {Meta, StoryObj} from '@storybook/html';
import {container} from '../Container'; // factory -> returns new Container(...)
import {button} from '../Button'; // factory -> returns new Button(...)
import {flexLayout} from '../layouts/FlexLayout';

// Helper to mount a Container instance into the story root element.
function renderContainer(cfg: Parameters<typeof container>[0]) {
    const root = document.createElement('div');
    const c = container(cfg);
    c.mount(root); // parent state is undefined at top level
    return root;
}

const meta: Meta = {
    title: 'Layout/FlexLayout',
};
export default meta;

type Story = StoryObj;

/**
 * 1. Basic horizontal row with gap, center-aligned vertically.
 *    justify = 'start' (elements packed left)
 */
export const RowStart: Story = {
    render: () =>
        renderContainer({
            layout: flexLayout({
                direction: 'row',
                gap: '0.5rem',
                align: 'center',
                justify: 'start',
            }),
            // we don't need className for layout now, but we can still style background/border:
            className: 'p-4 bg-base-200 rounded-xl shadow-md',
            items: [
                button({text: 'One'}),
                button({text: 'Two'}),
                button({text: 'Three'}),
            ],
        }),
};

/**
 * 2. Row with space-between justification: items spread to edges.
 *    align = 'center' to line them up vertically.
 */
export const RowSpaceBetween: Story = {
    render: () =>
        renderContainer({
            layout: flexLayout({
                direction: 'row',
                gap: '1rem',
                align: 'center',
                justify: 'between',
            }),
            className: 'p-4 bg-base-200 rounded-xl shadow-md w-full',
            items: [
                button({text: 'Left'}),
                button({text: 'Middle'}),
                button({text: 'Right'}),
            ],
        }),
};

/**
 * 3. Column stack (direction: 'column') with 1rem gap.
 *    align = 'stretch' makes children expand horizontally.
 *    justify = 'start' (top of column).
 */
export const ColumnStack: Story = {
    render: () =>
        renderContainer({
            layout: flexLayout({
                direction: 'column',
                gap: '1rem',
                align: 'stretch',
                justify: 'start',
            }),
            className: 'p-4 bg-base-200 rounded-xl shadow-md max-w-sm',
            items: [
                button({text: 'Primary', color: 'primary', block: true}),
                button({text: 'Secondary', color: 'secondary', block: true}),
                button({text: 'Accent', color: 'accent', block: true}),
            ],
        }),
};

/**
 * 4. Wrap example:
 *    - direction: row
 *    - wrap: true so children break to multiple lines
 *    - gap: 0.5rem
 *
 *    Each child uses .props.flex to demonstrate per-child override.
 *    Some are "flex: 0 0 auto" (don't stretch), others "flex: 1 1 auto" (stretch).
 */
export const RowWrapWithFlexOverrides: Story = {
    render: () =>
        renderContainer({
            layout: flexLayout({
                direction: 'row',
                wrap: true,
                gap: '0.5rem',
                align: 'start',
                justify: 'start',
                defaultItem: {
                    flex: '0 0 auto',
                },
            }),
            className: 'p-4 bg-base-200 rounded-xl shadow-md max-w-md',
            items: [
                button({text: 'Static', flex: '0 0 auto'}),
                button({text: 'Grow 1', flex: '1 1 auto'}),
                button({text: 'Grow 2', flex: '2 1 auto'}),
                button({text: 'Static B', flex: '0 0 auto'}),
                button({text: 'Static C', flex: '0 0 auto'}),
                button({text: 'Wide', flex: '3 1 auto'}),
                button({text: 'One more', flex: '1 1 auto'}),
            ],
        }),
};

/**
 * 5. Mixed vertical alignment per child (alignSelf override).
 *    Container align='stretch' but individual children tweak alignSelf.
 */
export const PerChildAlignSelf: Story = {
    render: () =>
        renderContainer({
            layout: flexLayout({
                direction: 'row',
                gap: '1rem',
                align: 'stretch',
                justify: 'start',
                defaultItem: {
                    flex: '0 0 auto',
                    alignSelf: 'stretch',
                },
            }),
            className:
                'p-4 bg-base-200 rounded-xl shadow-md h-40 w-full flex-col md:flex-row',
            // We'll simulate height differences so you can see alignSelf:
            items: [
                button({
                    text: 'Top',
                    alignSelf: 'start',
                    className: 'h-8',
                }),
                button({
                    text: 'Center',
                    alignSelf: 'center',
                    className: 'h-16',
                }),
                button({
                    text: 'Bottom',
                    alignSelf: 'end',
                    className: 'h-12',
                }),
                button({
                    text: 'Stretch',
                    // no alignSelf override -> inherits 'stretch'
                    className: 'min-h-8 flex items-center justify-center',
                }),
            ],
        }),
};
