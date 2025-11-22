import type { Meta, StoryObj } from '@storybook/html';
import { alert } from '../Alert';
import { button } from '../Button';
import { mountComponent } from '../testing/mount';

function renderAlert(args: Record<string, any>) {
    const cmp = alert({ ...args });
    return mountComponent(cmp);
}

const meta = {
    title: 'Weave/Alert',
    render: (args) => renderAlert(args),
    argTypes: {
        variant: { control: 'select', options: ['solid', 'soft', 'outline', 'dashed'] },
        color: {
            control: 'select',
            options: ['default', 'primary', 'secondary', 'info', 'success', 'warning', 'error']
        },
        title: { control: 'text' },
        content: { control: 'text' }, // <-- nuovo: accetta stringa (altrimenti configura per story)
        icon: { control: 'text' },
        actions: { table: { disable: true } },
        className: { control: 'text' }
    },
    args: {
        variant: 'solid',
        color: 'primary',
        title: null,
        content: 'Welcome to our platform! Explore our latest features and updates.',
        icon: null,
        className: '',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/* ------------------------------------------------------------------ */

export const Variants: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-col gap-3';
        (['solid', 'soft', 'outline', 'dashed'] as const).forEach((variant) => {
            const el = alert({
                variant,
                color: 'warning',
                content: `Variant: ${variant}`
            });
            wrap.appendChild(mountComponent(el));
        });
        return wrap;
    },
};

/* ------------------------------------------------------------------ */

export const WithIcon: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-col gap-3';

        wrap.appendChild(
            mountComponent(
                alert({
                    color: 'warning',
                    icon: 'alert-triangle',
                    content: '<p><span class="text-lg font-semibold">Warning alert:</span> Stay informed about the latest updates and upcoming events.</p>'
                })
            ),
        );

        wrap.appendChild(
            mountComponent(
                alert({
                    color: 'success',
                    icon: 'circle-check',
                    content: 'Your transaction was successful. Thank you for choosing our service!',
                    variant: 'soft'
                })
            )
        );

        return wrap;
    },
};

/* ------------------------------------------------------------------ */

export const Descriptive: Story = {
    render: () =>
        mountComponent(
            alert({
                variant: 'soft',
                color: 'primary',
                icon: 'check',
                title: 'Server maintenance in progress',
                content: 'Our servers are currently undergoing maintenance. We apologize for any inconvenience caused and appreciate your patience.'
            }),
        ),
};

/* ------------------------------------------------------------------ */

export const WithList: Story = {
    render: () =>
        mountComponent(
            alert({
                variant: 'soft',
                color: 'primary',
                icon: 'info-circle',
                title: 'Please ensure that your password meets the following requirements:',
                // contenuto ricco con sanificazione
                content: {
                    body: `
                        <ul class="mt-1.5 list-inside list-disc">
                          <li>Contains a minimum of 10 characters and a maximum of 100 characters.</li>
                          <li>Includes at least one lowercase character.</li>
                          <li>Incorporates at least one special character such as !, @, #, or ?.</li>
                        </ul>
                      `,
                    sanitize: true
                }
            })
        )
};

/* ------------------------------------------------------------------ */

export const WithActions: Story = {
    render: () => {
        const okBtn = button({
            text: 'Ok',
            color: 'primary',
            size: 'sm',
            onClick: () => console.log('OK clicked')
        });
        const cancelBtn = button({ text: 'Cancel', variant: 'outline', color: 'secondary', size: 'sm' });
        const moreBtn = button({
            text: 'Learn more',
            color: 'info',
            size: 'sm',
            iconLeft: 'icon-[tabler--info-circle] size-4.5'
        });

        const el = alert({
            variant: 'soft',
            color: 'primary',
            content: 'Please read the policy. These can be configured in Settings.',
            actions: [okBtn, cancelBtn, moreBtn]
        });
        return mountComponent(el);
    }
};