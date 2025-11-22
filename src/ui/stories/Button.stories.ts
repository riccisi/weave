import type {Meta, StoryObj} from '@storybook/html';
import {button} from '../Button';
import {mountComponent} from '../testing/mount';

function renderButton(args: Record<string, any>) {
    const btn = button({...args});
    return mountComponent(btn);
}

const meta = {
    title: 'Weave/Button',
    render: (args) => renderButton(args),
    argTypes: {
        text: {control: 'text'},
        disabled: {control: 'boolean'},
        variant: {
            control: {type: 'select'},
            options: ['solid', 'soft', 'outline', 'text', 'gradient']
        },
        color: {
            control: {type: 'select'},
            options: ['default', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error']
        },
        size: {
            control: {type: 'select'},
            options: ['xs', 'sm', 'md', 'lg', 'xl']
        },
        wide: {control: 'boolean'},
        block: {control: 'boolean'},
        glass: {control: 'boolean'},
        active: {control: 'boolean'},
        loading: {control: 'boolean'},
        shape: {
            control: {type: 'select'},
            options: ['rounded', 'pill', 'circle', 'square']
        },
        iconLeft: {control: 'text'},
        iconRight: {control: 'text'},
        customColor: {control: 'text'},
        onClick: {action: 'clicked'},
        className: {control: 'text'},
        waves: {control: 'boolean'},
        wavesTone: {
            control: {type: 'select'},
            options: ['light', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error']
        },
        ariaLabel: {control: 'text'}
    },
    args: {
        text: 'Button',
        disabled: false,
        variant: 'solid',
        color: 'primary',
        size: 'md',
        wide: false,
        block: false,
        glass: false,
        active: false,
        loading: false,
        shape: 'rounded',
        iconLeft: null,
        iconRight: null,
        customColor: null,
        className: '',
        waves: false,
        wavesTone: 'light'
    }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-wrap gap-3';
        const variants = ['solid', 'soft', 'outline', 'text', 'gradient'] as const;
        variants.forEach((variant) => {
            const btn = button({text: variant, variant, color: 'primary'});
            wrap.appendChild(mountComponent(btn));
        });
        return wrap;
    }
};

export const Colors: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-wrap gap-3';
        (['default', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'] as const).forEach((color) => {
            const btn = button({text: color, color});
            wrap.appendChild(mountComponent(btn));
        });
        return wrap;
    }
};

export const Sizes: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex items-center gap-3';
        (['xs', 'sm', 'md', 'lg', 'xl'] as const).forEach((size) => {
            const btn = button({text: size, size, color: 'primary'});
            wrap.appendChild(mountComponent(btn));
        });
        return wrap;
    }
};

export const Shapes: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-wrap items-center gap-3';
        const rounded = button({text: 'Rounded', shape: 'rounded', color: 'primary'});
        const pill = button({text: 'Pill', shape: 'pill', color: 'primary'});
        const circle = button({
            text: '',
            shape: 'circle',
            color: 'primary',
            ariaLabel: 'Star',
            iconLeft: 'icon-[tabler--star] size-4.5'
        });
        const square = button({
            text: '',
            shape: 'square',
            color: 'secondary',
            ariaLabel: 'Heart',
            iconLeft: 'icon-[tabler--heart] size-4.5'
        });
        [rounded, pill, circle, square].forEach((b) => wrap.appendChild(mountComponent(b)));
        return wrap;
    }
};

export const BlockAndWide: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-col gap-3 w-full max-w-md';

        const wide = button({text: 'Wide (extra X padding)', wide: true, color: 'primary'});
        const block = button({text: 'Block (full width)', block: true, color: 'secondary'});
        wrap.appendChild(mountComponent(wide));
        wrap.appendChild(mountComponent(block));
        return wrap;
    }
};

export const LoadingAndStates: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-wrap items-center gap-3';
        const loading = button({text: 'Loading...', loading: true, color: 'primary'});
        const active = button({text: 'Active', active: true, color: 'accent'});
        const disabled = button({text: 'Disabled', disabled: true, color: 'secondary'});
        [loading, active, disabled].forEach((b) => wrap.appendChild(mountComponent(b)));
        return wrap;
    }
};

export const WithIcons: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-wrap items-center gap-3';
        const left = button({
            text: 'Star',
            color: 'primary',
            iconLeft: 'icon-[tabler--star] size-4.5'
        });
        const right = button({
            text: 'Next',
            color: 'secondary',
            iconRight: 'icon-[tabler--arrow-right] size-4.5'
        });
        const both = button({
            text: 'Shuffle',
            color: 'accent',
            iconLeft: 'icon-[tabler--player-track-prev] size-4.5',
            iconRight: 'icon-[tabler--player-track-next] size-4.5'
        });
        [left, right, both].forEach((b) => wrap.appendChild(mountComponent(b)));
        return wrap;
    }
};

export const CustomColorAndWaves: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    'Esempi con colore custom via `--btn-color` (text bianco aggiunto via `className`) e waves (richiede plugin waves di FlyonUI).'
            }
        }
    },
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-wrap items-center gap-3';
        const custom = button({
            text: 'Custom',
            customColor: '#ff4800',
            className: 'text-white',
            color: 'default'
        });
        const wavesBtn = button({text: 'Waves', color: 'primary', waves: true, wavesTone: 'primary'});
        wrap.appendChild(mountComponent(custom));
        wrap.appendChild(mountComponent(wavesBtn));
        return wrap;
    }
};
