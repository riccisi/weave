import type { Meta, StoryObj } from '@storybook/html';
import { PasswordField } from '../inputs/PasswordField';

const meta: Meta = {
    title: 'Form/PasswordField',
    render: (args) => {
        const root = document.createElement('div');
        const field = new PasswordField(args);
        field.mount(root);
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
        label: 'Password',
        labelMode: 'inline',
        required: true,
        minLength: 8,
        helperText: 'Almeno 8 caratteri',
    },
};

export const WithConfirmationHint: Story = {
    args: {
        label: 'Nuova password',
        labelMode: 'floating',
        placeholder: '••••••••',
        helperText: 'Usa caratteri speciali e numeri',
    },
};
