/**
 * Storybook showcase for the declarative flex layout helper.
 */
import type { Meta, StoryObj } from '@storybook/html';
import { Container } from '../Container';
import { flexLayout } from '../layouts/FlexLayout';
import { button } from '../Button';

const meta = {
  title: 'Layout/FlexLayout'
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const RowGapAndGrow: Story = {
  render: () => {
    const toolbar = new Container({
      layout: flexLayout({
        direction: 'row',
        gap: '0.5rem',
        justify: 'between',
        align: 'center',
        defaultItem: {
          flex: '0 0 auto'
        }
      }),
      items: [
        button({ text: 'Back' }),
        button({ text: 'Save', color: 'primary' }),
        button({ text: 'Danger', color: 'error' })
      ]
    });

    const wrapper = document.createElement('div');
    toolbar.mount(wrapper);

    return wrapper;
  }
};
