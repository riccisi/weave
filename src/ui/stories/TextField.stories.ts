// stories/TextField.stories.ts
import type { Meta, StoryObj } from '@storybook/html';
import { TextField } from '../inputs/TextField';

const meta: Meta = {
    title: 'Form/TextField',
    render: (args) => {
        const root = document.createElement('div');
        const tf = new TextField(args);
        tf.mount(root);
        return root;
    },
    argTypes: {
        labelMode: { control: 'select', options: ['none', 'inline', 'floating'] },
        size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
        spellcheck: { control: 'boolean' },
    },
};
export default meta;
type Story = StoryObj<Record<string, any>>;

export const Basic: Story = {
    args: {
        label: 'Your name',
        labelMode: 'inline',
        placeholder: 'Type here',
        value: '',
    },
};

export const Floating: Story = {
    args: {
        label: 'Email',
        labelMode: 'floating',
        placeholder: 'john@example.com',
        value: '',
    },
};

export const WithHelperAndValidation: Story = {
    args: {
        label: 'Required field',
        labelMode: 'inline',
        required: true,
        helperText: 'Questo campo è obbligatorio',
        value: '',
        minLength: 3,
    },
};

export const Sizes: Story = {
    args: {
        label: 'Label',
        labelMode: 'inline',
        size: 'lg',
        value: 'Preview',
    },
};

export const WithPattern: Story = {
    args: {
        label: 'ZIP Code',
        labelMode: 'inline',
        helperText: 'Formato: 5 cifre',
        pattern: '^\\d{5}$',
        placeholder: '00000',
    },
};
