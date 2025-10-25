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
    variant: { control: 'select', options: ['solid', 'soft', 'outline'] },
    color: {
      control: 'select',
      options: ['default','primary','secondary','info','success','warning','error']
    },
    title: { control: 'text' },
    message: { control: 'text' },
    icon: { control: 'text' },
    list: { control: 'object' },
    dismissible: { control: 'boolean' },
    closeLabel: { control: 'text' },
    responsive: { control: 'boolean' },
    actions: { table: { disable: true } },
    className: { control: 'text' },
    onDismiss: { action: 'dismissed' }
  },
  args: {
    variant: 'solid',
    color: 'primary',
    title: null,
    message: 'Welcome to our platform! Explore our latest features and updates.',
    icon: null,
    list: null,
    dismissible: false,
    closeLabel: 'Close',
    responsive: false,
    className: ''
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-col gap-3';
    (['solid','soft','outline'] as const).forEach(variant => {
      const el = alert({ variant, color: 'warning', message: `Variant: ${variant}` });
      wrap.appendChild(mountComponent(el));
    });
    return wrap;
  }
};

export const WithIcon: Story = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-col gap-3';
    wrap.appendChild(mountComponent(alert({
      color: 'warning',
      icon: 'icon-[tabler--alert-triangle] shrink-0 size-6',
      message: 'Stay informed about the latest updates and upcoming events.'
    })));
    wrap.appendChild(mountComponent(alert({
      color: 'success',
      icon: 'icon-[tabler--circle-check] shrink-0 size-6',
      message: 'Your transaction was successful. Thank you for choosing our service!',
      variant: 'soft'
    })));
    return wrap;
  }
};

export const Descriptive: Story = {
  render: () => mountComponent(alert({
    variant: 'soft',
    color: 'primary',
    icon: 'icon-[tabler--check] shrink-0 size-6',
    title: 'Server maintenance in progress',
    message: 'Our servers are currently undergoing maintenance. We apologize for any inconvenience caused and appreciate your patience.'
  }))
};

export const WithList: Story = {
  render: () => mountComponent(alert({
    variant: 'soft',
    color: 'primary',
    icon: 'icon-[tabler--info-circle] shrink-0 size-6',
    title: 'Please ensure that your password meets the following requirements:',
    list: [
      'Contains a minimum of 10 characters and a maximum of 100 characters.',
      'Includes at least one lowercase character.',
      'Incorporates at least one special character such as !, @, #, or ?.'
    ]
  }))
};

export const WithActions: Story = {
  render: () => {
    const okBtn = button({
      text: 'Ok',
      color: 'primary',
      size: 'sm',
      onClick: () => console.log('OK clicked')
    });
    const cancelBtn = button({ text: 'Cancel', variant: 'outline', color: 'secondary', size: 'sm' });
    const moreBtn = button({ text: 'Learn more', color: 'info', size: 'sm', iconLeft: 'icon-[tabler--info-circle] size-4.5' });

    const el = alert({
      variant: 'soft',
      color: 'primary',
      message: 'Please read the policy. These can be configured in Settings.',
      actions: [okBtn, cancelBtn, moreBtn]
    });
    return mountComponent(el);
  }
};

export const ResponsiveAndDismissible: Story = {
  render: () => {
    const ok = button({ text: 'Ok', color: 'primary', size: 'sm', onClick: () => console.log('OK') });
    const cancel = button({ text: 'Cancel', variant: 'outline', color: 'secondary', size: 'sm' });
    return mountComponent(alert({
      variant: 'soft',
      color: 'primary',
      icon: 'icon-[tabler--check] size-6 shrink-0',
      title: 'Server maintenance in progress',
      message: 'Our servers are currently undergoing maintenance. We apologize for any inconvenience caused and appreciate your patience.',
      responsive: true,
      dismissible: true,
      actions: [ok, cancel]
    }));
  }
};
