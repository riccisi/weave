// src/ui/stories/Card.stories.ts
import type { Meta, StoryObj } from '@storybook/html';
import { card } from '../Card';
import { button, Button } from '../Button';
import { mountComponent } from '../testing/mount';
import type { Component } from '../Component';
import { joinLayout } from '../layouts/JoinLayout';
import { html } from 'uhtml';

function normalizeComponent(entry: any): Component | undefined {
    if (!entry) return undefined;
    if (entry instanceof Button || (entry as Component)?.el) {
        return entry as Component;
    }
    return button(entry as Record<string, any>);
}

function normalizeArray(value: any): Component[] | undefined {
    if (!Array.isArray(value)) return undefined;
    return value
        .map((entry) => normalizeComponent(entry))
        .filter(Boolean) as Component[];
}

function renderCard(args: Record<string, any>) {
    const { items, actions, ...rest } = args;
    const cmp = card({
        ...rest,
        actions: normalizeArray(actions),
    });
    return mountComponent(cmp);
}

const meta = {
    title: 'Weave/Card',
    render: (args) => renderCard(args),
    argTypes: {
        // Header
        title: { control: 'text' },

        // Body (usa Content)
        content: { control: 'text' }, // per casi semplici; per quelli avanzati vedi le storie dedicate

        // Media
        imageSrc: { control: 'text' },
        imageAlt: { control: 'text' },
        imagePlacement: { control: 'inline-radio', options: ['top', 'side'] },
        imageFull: { control: 'boolean' },

        // Varianti shell
        compact: { control: 'boolean' },
        glass: { control: 'boolean' },
        bordered: { control: 'boolean' },

        // Classi extra opzionali
        bodyClassName: { control: 'text' },
        figureClassName: { control: 'text' },
        imageClassName: { control: 'text' },
        actionsClassName: { control: 'text' },
        className: { control: 'text' },

        // Non controlliamo da UI (gestiti via helper)
        layout: { table: { disable: true } },
        items: { table: { disable: true } },
        actions: { table: { disable: true } },
        actionsLayout: { table: { disable: true } },
    },
    args: {
        title: 'Discover immersive experiences',
        content:
            'Explore hand-picked destinations tailored to your passions and travel style.',
        imageSrc:
            'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80',
        imageAlt: 'Sunset over mountains and forest',
        imagePlacement: 'top',
        imageFull: false,
        compact: false,
        glass: false,
        bordered: false,
        className: 'sm:max-w-sm',
        bodyClassName: '',
        figureClassName: '',
        imageClassName: '',
        actionsClassName: '',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
    render: () =>
        renderCard({
            title: meta.args!.title,
            content: meta.args!.content,
            imageSrc: meta.args!.imageSrc,
            imageAlt: meta.args!.imageAlt,
            actions: [
                button({ text: 'Details', color: 'primary', size: 'sm' }),
                button({ text: 'Save for later', variant: 'outline', size: 'sm' }),
            ],
        }),
};

export const Horizontal: Story = {
    render: () =>
        renderCard({
            title: 'Collaborative workspaces',
            content:
                'Modern offices designed to boost productivity and teamwork.',
            imageSrc:
                'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80',
            imageAlt: 'Coworking area with large desk and laptops',
            imagePlacement: 'side',
            actions: [
                button({ text: 'Book a visit', color: 'accent', size: 'sm' }),
                button({ text: 'Share', variant: 'soft', size: 'sm' }),
            ],
        }),
};

export const WithBodyLayout: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-col gap-6';

        const cardCmp = card({
            title: 'Essential toolkit',
            content:
                'Curated tools that help your team prototype faster and ship better products.',
            media:
                'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80',

            actions: [button({ text: 'Get started', color: 'primary' })],
        });

        wrap.appendChild(mountComponent(cardCmp));
        return wrap;
    },
};

export const ImageFull: Story = {
    render: () =>
        renderCard({
            title: 'Night skyline stories',
            content: 'Capture vibrant city lights and discover hidden rooftops.',
            imageSrc:
                'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
            imageFull: true,
            glass: true,
            actions: [
                button({ text: 'Read article', color: 'primary', variant: 'solid' }),
                button({ text: 'Bookmark', variant: 'outline' }),
            ],
        }),
};

/** --- nuovi esempi che mostrano la flessibilità del Content --- */

// 1) Content come funzione reattiva
export const ReactiveContent: Story = {
    render: () =>
        renderCard({
            title: 'Reactive body',
            content: (s) => html`Hello <b>${s.id()}</b> at ${new Date().toLocaleTimeString()}`,
            actions: [button({ text: 'Action', color: 'primary', size: 'sm' })],
        }),
};

// 2) Content con HTML complesso (link + tabella), sanificato
export const RichHtmlContent: Story = {
    render: () =>
        renderCard({
            title: 'Policy & data',
            content: {
                body: `
                  Please read the
                  <a href="#" class="link link-primary font-semibold">policy</a>.
                  These can be configured in Settings. See table below:
                  <table class="mt-3 table">
                    <thead><tr><th>Header</th></tr></thead>
                    <tbody><tr><td>Content</td></tr></tbody>
                  </table>
                `,
                sanitize: true,
                wrapper: 'auto', // sarà single-root? No → wrapper auto con display:contents
            },
            actions: [
                button({ text: 'Ok', color: 'primary', size: 'sm' }),
                button({ text: 'Cancel', variant: 'outline', size: 'sm' }),
            ],
        }),
};
