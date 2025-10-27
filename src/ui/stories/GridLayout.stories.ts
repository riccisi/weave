/**
 * Storybook showcase for the CSS grid layout helper.
 */
import type { Meta, StoryObj } from '@storybook/html';
import { Container } from '../Container';
import { gridLayout } from '../layouts/GridLayout';
import { button } from '../Button';

const meta = {
  title: 'Layout/GridLayout'
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ResponsiveCards: Story = {
  render: () => {
    const grid = new Container({
      layout: gridLayout({
        columns: 'repeat(auto-fit,minmax(16rem,1fr))',
        gap: '1rem',
        alignItems: 'start',
        justifyItems: 'stretch'
      }),
      items: [
        new Container({
          className: 'rounded-xl border border-base-300 bg-base-200 p-4 shadow-sm',
          gridColumn: 'span 2',
          items: [
            button({ text: 'Inside card A' })
          ]
        }),
        new Container({
          className: 'rounded-xl border border-base-300 bg-base-200 p-4 shadow-sm',
          items: [
            button({ text: 'Inside card B' })
          ]
        }),
        new Container({
          className: 'rounded-xl border border-base-300 bg-base-200 p-4 shadow-sm',
          items: [
            button({ text: 'Inside card C' })
          ]
        })
      ]
    });

    const wrapper = document.createElement('div');
    grid.mount(wrapper);

    return wrapper;
  }
};
