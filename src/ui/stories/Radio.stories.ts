// stories/Radio.stories.ts
import type { Meta, StoryObj } from '@storybook/html';
import { radio } from '../inputs/Radio';

const COLORS = ['default', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'] as const;

const meta: Meta = {
  title: 'Form/Radio',
  render: (args) => {
    const root = document.createElement('div');
    const cmp = radio(args);
    cmp.mount(root);
    return root;
  },
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    labelMode: { control: 'select', options: ['none', 'inline', 'floating'] },
    labelPlacement: { control: 'inline-radio', options: ['left', 'right'] },
    color: { control: 'select', options: COLORS },
    variant: { control: 'inline-radio', options: ['default', 'inset'] },
    required: { control: 'boolean' },
    value: { control: 'boolean' }
  }
};

export default meta;

type Story = StoryObj<Record<string, any>>;

export const Playground: Story = {
  args: {
    label: 'Seleziona questa opzione',
    labelMode: 'inline',
    labelPlacement: 'right',
    helperText: 'Questo radio button supporta colori, varianti e dimensioni.',
    value: true,
    color: 'primary'
  }
};

export const LabelPlacements: Story = {
  render: () => {
    const root = document.createElement('div');
    root.className = 'flex flex-col gap-4';

    radio({
      label: 'Etichetta a destra',
      labelMode: 'inline',
      labelPlacement: 'right',
      value: true
    }).mount(root);

    radio({
      label: 'Etichetta a sinistra',
      labelMode: 'inline',
      labelPlacement: 'left'
    }).mount(root);

    return root;
  }
};

export const Colors: Story = {
  render: () => {
    const root = document.createElement('div');
    root.className = 'flex flex-wrap gap-4';

    for (const color of COLORS) {
      radio({
        label: `Colore ${color}`,
        labelMode: 'inline',
        color,
        value: color === 'primary'
      }).mount(root);
    }

    return root;
  }
};

export const Variants: Story = {
  render: () => {
    const root = document.createElement('div');
    root.className = 'flex flex-col gap-4';

    radio({
      label: 'Standard',
      labelMode: 'inline',
      value: true
    }).mount(root);

    radio({
      label: 'Inset',
      labelMode: 'inline',
      variant: 'inset'
    }).mount(root);

    return root;
  }
};

export const Sizes: Story = {
  render: () => {
    const root = document.createElement('div');
    root.className = 'flex flex-col gap-4';

    (['xs', 'sm', 'md', 'lg', 'xl'] as const).forEach((size) => {
      radio({
        label: `Dimensione ${size.toUpperCase()}`,
        labelMode: 'inline',
        size,
        value: size === 'md'
      }).mount(root);
    });

    return root;
  }
};

export const StatesAndHelper: Story = {
  render: () => {
    const root = document.createElement('div');
    root.className = 'flex flex-col gap-4';

    radio({
      label: 'Con helper text',
      labelMode: 'inline',
      helperText: 'Spiega come verrà usata questa scelta.'
    }).mount(root);

    radio({
      label: 'Richiesto non selezionato',
      labelMode: 'inline',
      required: true,
      touched: true,
      valid: false,
      invalidMessage: 'Seleziona almeno un’opzione'
    }).mount(root);

    return root;
  }
};
