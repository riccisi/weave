import type { Meta, StoryObj } from '@storybook/html';
import { Card, type CardActionsAlign, type CardImagePlacement } from '../Card';
import { Button } from '../Button';
import { mountComponent } from '../testing/mount';

function renderCard(args: Record<string, any>) {
    const cmp = new Card({ ...args });
    return mountComponent(cmp);
}

const meta = {
    title: 'Weave/Card',
    render: (args) => renderCard(args),
    argTypes: {
        title: { control: 'text' },
        description: { control: 'text' },
        imageSrc: { control: 'text' },
        imageAlt: { control: 'text' },
        imagePlacement: { control: 'inline-radio', options: ['top', 'side'] satisfies CardImagePlacement[] },
        imageFull: { control: 'boolean' },
        compact: { control: 'boolean' },
        glass: { control: 'boolean' },
        bordered: { control: 'boolean' },
        actionsAlign: {
            control: 'select',
            options: ['start', 'center', 'end', 'between', 'around', 'evenly'] satisfies CardActionsAlign[],
        },
        actionsWrap: { control: 'boolean' },
        bodyClassName: { control: 'text' },
        figureClassName: { control: 'text' },
        imageClassName: { control: 'text' },
        actionsClassName: { control: 'text' },
        layout: { table: { disable: true } },
        items: { table: { disable: true } },
        actions: { table: { disable: true } },
        actionsLayout: { table: { disable: true } },
        className: { control: 'text' },
    },
    args: {
        title: 'Discover immersive experiences',
        description: 'Explore hand-picked destinations tailored to your passions and travel style.',
        imageSrc: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80',
        imageAlt: 'Sunset over mountains and forest',
        imagePlacement: 'top',
        imageFull: false,
        compact: false,
        glass: false,
        bordered: false,
        actionsAlign: 'end',
        actionsWrap: false,
        className: '',
        bodyClassName: '',
        figureClassName: '',
        imageClassName: '',
        actionsClassName: '',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
    args: {
        actions: [
            { wtype: 'button', text: 'Details', color: 'primary', size: 'sm' },
            { wtype: 'button', text: 'Save for later', variant: 'outline', size: 'sm' },
        ],
    },
};

export const Horizontal: Story = {
    render: () => renderCard({
        title: 'Collaborative workspaces',
        description: 'Modern offices designed to boost productivity and teamwork.',
        imageSrc: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80',
        imageAlt: 'Coworking area with large desk and laptops',
        imagePlacement: 'side',
        actions: [
            { wtype: 'button', text: 'Book a visit', color: 'accent', size: 'sm' },
            { wtype: 'button', text: 'Share', variant: 'soft', size: 'sm' },
        ],
    }),
};

export const WithBodyLayout: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-col gap-6';

        const card = new Card({
            title: 'Essential toolkit',
            description: 'Curated tools that help your team prototype faster and ship better products.',
            imageSrc: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80',
            layout: { type: 'join', orientation: 'horizontal', className: 'rounded-btn' },
            items: [
                new Button({ text: 'Design kit', color: 'primary', size: 'sm' }),
                new Button({ text: 'Developer docs', variant: 'outline', size: 'sm' }),
                new Button({ text: 'Community', variant: 'soft', color: 'secondary', size: 'sm' }),
            ],
            actions: [
                { wtype: 'button', text: 'Get started', color: 'primary' },
            ],
        });

        wrap.appendChild(mountComponent(card));
        return wrap;
    },
};

export const ImageFull: Story = {
    render: () => renderCard({
        title: 'Night skyline stories',
        description: 'Capture vibrant city lights and discover hidden rooftop locations.',
        imageSrc: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
        imageFull: true,
        glass: true,
        actions: [
            { wtype: 'button', text: 'Read article', color: 'primary', variant: 'solid' },
            { wtype: 'button', text: 'Bookmark', variant: 'outline' },
        ],
    }),
};
