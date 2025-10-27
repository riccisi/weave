import type { Meta, StoryObj } from '@storybook/html';
import { card, type CardActionsAlign, type CardImagePlacement } from '../Card';
import { button, Button } from '../Button';
import { mountComponent } from '../testing/mount';
import type { Component } from '../Component';
import { joinLayout } from '../layouts/JoinLayout';

function normalizeComponent(entry: any): Component | undefined {
  if (!entry) return undefined;
  if (entry instanceof Button || (entry as Component)?.el) {
    return entry as Component;
  }
  return button(entry as Record<string, any>);
}

function normalizeArray(value: any): Component[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((entry) => normalizeComponent(entry)).filter(Boolean) as Component[];
}

function renderCard(args: Record<string, any>) {
  const { items, actions, ...rest } = args;
  const cmp = card({
    ...rest,
    items: normalizeArray(items),
    actions: normalizeArray(actions)
  });
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
      options: ['start', 'center', 'end', 'between', 'around', 'evenly'] satisfies CardActionsAlign[]
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
    className: { control: 'text' }
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
    actionsClassName: ''
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => renderCard({
    title: meta.args!.title,
    description: meta.args!.description,
    imageSrc: meta.args!.imageSrc,
    imageAlt: meta.args!.imageAlt,
    actions: [
      button({ text: 'Details', color: 'primary', size: 'sm' }),
      button({ text: 'Save for later', variant: 'outline', size: 'sm' })
    ]
  })
};

export const Horizontal: Story = {
  render: () => renderCard({
    title: 'Collaborative workspaces',
    description: 'Modern offices designed to boost productivity and teamwork.',
    imageSrc: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Coworking area with large desk and laptops',
    imagePlacement: 'side',
    actions: [
      button({ text: 'Book a visit', color: 'accent', size: 'sm' }),
      button({ text: 'Share', variant: 'soft', size: 'sm' })
    ]
  })
};

export const WithBodyLayout: Story = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-col gap-6';

    const cardCmp = card({
      title: 'Essential toolkit',
      description: 'Curated tools that help your team prototype faster and ship better products.',
      imageSrc: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80',
      layout: joinLayout({ orientation: 'horizontal', rounded: 'rounded-btn' }),
      items: [
        button({ text: 'Design kit', color: 'primary', size: 'sm' }),
        button({ text: 'Developer docs', variant: 'outline', size: 'sm' }),
        button({ text: 'Community', variant: 'soft', color: 'secondary', size: 'sm' })
      ],
      actions: [button({ text: 'Get started', color: 'primary' })]
    });

    wrap.appendChild(mountComponent(cardCmp));
    return wrap;
  }
};

export const ImageFull: Story = {
  render: () => renderCard({
    title: 'Night skyline stories',
    description: 'Capture vibrant city lights and discover hidden rooftop locations.',
    imageSrc: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
    imageFull: true,
    glass: true,
    actions: [
      button({ text: 'Read article', color: 'primary', variant: 'solid' }),
      button({ text: 'Bookmark', variant: 'outline' })
    ]
  })
};
