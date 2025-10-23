// stories/Radio.stories.ts
import type { Meta, StoryObj } from '@storybook/html';
import { Radio } from '../inputs/Radio';

const COLORS = ['default', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'] as const;

const meta: Meta = {
    title: 'Form/Radio',
    render: (args) => {
        const root = document.createElement('div');
        const radio = new Radio(args);
        radio.mount(root);
        return root;
    },
    argTypes: {
        size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
        labelMode: { control: 'select', options: ['none', 'inline', 'floating'] },
        labelPlacement: { control: 'inline-radio', options: ['left', 'right'] },
        color: { control: 'select', options: COLORS },
        variant: { control: 'inline-radio', options: ['default', 'inset'] },
        required: { control: 'boolean' },
        value: { control: 'boolean' },
    },
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
        color: 'primary',
    },
};

export const LabelPlacements: Story = {
    render: () => {
        const root = document.createElement('div');
        root.className = 'flex flex-col gap-4';

        const right = new Radio({
            label: 'Etichetta a destra',
            labelMode: 'inline',
            labelPlacement: 'right',
            value: true,
        });
        right.mount(root);

        const left = new Radio({
            label: 'Etichetta a sinistra',
            labelMode: 'inline',
            labelPlacement: 'left',
        });
        left.mount(root);

        return root;
    },
};

export const Colors: Story = {
    render: () => {
        const root = document.createElement('div');
        root.className = 'flex flex-wrap gap-4';

        for (const color of COLORS) {
            const radio = new Radio({
                label: `Colore ${color}`,
                labelMode: 'inline',
                color,
                value: color === 'primary',
            });
            radio.mount(root);
        }

        return root;
    },
};

export const Variants: Story = {
    render: () => {
        const root = document.createElement('div');
        root.className = 'flex flex-col gap-4';

        const standard = new Radio({
            label: 'Standard',
            labelMode: 'inline',
            value: true,
        });
        standard.mount(root);

        const inset = new Radio({
            label: 'Inset',
            labelMode: 'inline',
            variant: 'inset',
        });
        inset.mount(root);

        return root;
    },
};

export const Sizes: Story = {
    render: () => {
        const root = document.createElement('div');
        root.className = 'flex flex-col gap-4';

        const sizes: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl'> = ['xs', 'sm', 'md', 'lg', 'xl'];
        for (const size of sizes) {
            const radio = new Radio({
                label: `Dimensione ${size.toUpperCase()}`,
                labelMode: 'inline',
                size,
                value: size === 'md',
            });
            radio.mount(root);
        }

        return root;
    },
};

export const StatesAndHelper: Story = {
    render: () => {
        const root = document.createElement('div');
        root.className = 'flex flex-col gap-4';

        const helper = new Radio({
            label: 'Con helper text',
            labelMode: 'inline',
            helperText: 'Spiega come verrà usata questa scelta.',
        });
        helper.mount(root);

        const required = new Radio({
            label: 'Richiesto non selezionato',
            labelMode: 'inline',
            required: true,
            touched: true,
            valid: false,
            invalidMessage: 'Seleziona almeno un’opzione',
        });
        required.mount(root);

        return root;
    },
};
