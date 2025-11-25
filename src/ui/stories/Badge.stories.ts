// src/ui/stories/Badge.stories.ts
import type {Meta, StoryObj} from '@storybook/html';
import {container} from '../Container';
import {flexLayout} from '../layouts/FlexLayout';
import {badge} from '../Badge';
import {button} from '../Button'; // solo se vuoi confrontarli visivamente, opzionale

// Helper per montare un container nel div target controllato da Storybook.
function renderBadgeRow(items: any[]) {
    // items è un array di Component (es badge()).
    const row = container({
        className: 'p-4 bg-base-200 rounded-xl shadow-md',
        layout: flexLayout({
            direction: 'row',
            gap: '0.5rem',
            align: 'center',
            justify: 'start',
            wrap: true
        }),
        items
    });

    // Storybook HTML renderer: ritorniamo un elemento root in cui montiamo
    // il container imperativamente.
    const mountPoint = document.createElement('div');
    row.mount(mountPoint);
    return mountPoint;
}

const meta: Meta = {
    title: 'Weave/Badge',
    render: (args: any) => {
        // di default mostriamo una singola istanza con args;
        // args sarà passato come config al badge() factory
        const single = badge(args || {});
        const host = document.createElement('div');
        host.className = 'p-6 flex flex-row gap-4 bg-base-100';
        single.mount(host);
        return host;
    },
    argTypes: {
        text: {control: 'text'},
        color: {
            control: 'select',
            options: [
                'default', 'primary', 'secondary', 'accent',
                'info', 'success', 'warning', 'error'
            ]
        },
        variant: {
            control: 'select',
            options: ['solid', 'soft', 'outline', 'ghost']
        },
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg', 'xl']
        },
        pill: {control: 'boolean'},
        dot: {control: 'boolean'},
        icon: {control: 'text'},
        iconPosition: {
            control: 'inline-radio',
            options: ['left', 'right']
        },
        className: {control: 'text'},
    }
};
export default meta;

type Story = StoryObj;

/**
 * Story base controllabile da Controls.
 */
export const Playground: Story = {
    args: {
        text: 'New',
        color: 'primary',
        variant: 'soft',
        size: 'md',
        pill: true,
        dot: false,
        icon: 'icon-[tabler--star] size-4',
        iconPosition: 'left',
        className: ''
    }
};

/**
 * Varianti colore tipiche.
 */
export const Colors: Story = {
    render: () => {
        return renderBadgeRow([
            badge({text: 'Default', color: 'default', variant: 'solid'}),
            badge({text: 'Primary', color: 'primary', variant: 'solid'}),
            badge({text: 'Success', color: 'success', variant: 'solid'}),
            badge({text: 'Warning', color: 'warning', variant: 'solid'}),
            badge({text: 'Error', color: 'error', variant: 'solid'})
        ]);
    }
};

/**
 * Varianti visive (solid / soft / outline / ghost) con lo stesso colore.
 */
export const Variants: Story = {
    render: () => {
        return renderBadgeRow([
            badge({text: 'Solid', color: 'primary', variant: 'solid'}),
            badge({text: 'Soft', color: 'primary', variant: 'soft'}),
            badge({text: 'Outline', color: 'primary', variant: 'outline'}),
            badge({text: 'Ghost', color: 'primary', variant: 'ghost'})
        ]);
    }
};

/**
 * Diverse size e pill.
 */
export const SizesAndPill: Story = {
    render: () => {
        return renderBadgeRow([
            badge({text: 'XS pill', size: 'xs', pill: true, color: 'info', variant: 'soft'}),
            badge({text: 'SM', size: 'sm', pill: false, color: 'info', variant: 'soft'}),
            badge({text: 'MD', size: 'md', pill: false, color: 'info', variant: 'soft'}),
            badge({text: 'LG pill', size: 'lg', pill: true, color: 'info', variant: 'soft'}),
            badge({text: 'XL pill', size: 'xl', pill: true, color: 'info', variant: 'soft'})
        ]);
    }
};

/**
 * Dot badge e badge icona.
 * - dot:true aggiunge la classe 'badge-dot'.
 * - icon mostra piccole icone utility; iconPosition ne controlla il lato.
 */
export const DotAndIcons: Story = {
    render: () => {
        return renderBadgeRow([
            badge({
                text: 'Online',
                color: 'success',
                variant: 'soft',
                dot: true,
                icon: 'icon-[tabler--circle-check] size-4',
                iconPosition: 'left'
            }),
            badge({
                text: 'Alert',
                color: 'warning',
                variant: 'outline',
                pill: true,
                icon: 'icon-[tabler--alert-triangle] size-4',
                iconPosition: 'left'
            }),
            badge({
                text: 'Info',
                color: 'info',
                variant: 'ghost',
                icon: 'icon-[tabler--info-circle] size-4',
                iconPosition: 'right'
            }),
            badge({
                text: '',
                color: 'error',
                variant: 'solid',
                dot: true,
                pill: true,
                icon: 'icon-[tabler--bell] size-4',
                iconPosition: 'left'
            })
        ]);
    }
};

/**
 * Badge assieme ad altri componenti (es: bottoni) per far vedere che coesiste
 * dentro un layout flex. Questo aiuta a validare la compatibilità di spacing / align.
 */
export const InToolbarLikeRow: Story = {
    render: () => {
        const row = container({
            className: 'p-4 bg-base-100 shadow rounded-xl',
            layout: flexLayout({
                direction: 'row',
                gap: '0.75rem',
                align: 'center',
                justify: 'start'
            }),
            items: [
                button({
                    text: 'Save',
                    color: 'primary',
                    variant: 'solid',
                    size: 'sm'
                }),
                badge({
                    text: 'Draft',
                    color: 'warning',
                    variant: 'soft',
                    size: 'sm',
                    pill: true
                }),
                badge({
                    text: 'Experimental',
                    color: 'secondary',
                    variant: 'outline',
                    size: 'sm',
                    pill: false,
                    dot: true,
                    icon: 'icon-[tabler--flask] size-4',
                    iconPosition: 'left'
                })
            ]
        });

        const host = document.createElement('div');
        row.mount(host);
        return host;
    }
};
