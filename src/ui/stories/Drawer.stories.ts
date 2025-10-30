import type { Meta, StoryObj } from '@storybook/html';
import { drawer } from '../Drawer';
import { markup } from '../Markup';
import { button } from '../Button';
import { mountComponent } from '../testing/mount';
import { html } from 'uhtml';

const meta = {
  title: 'Weave/Drawer',
  render: () => {
    const dr = drawer();
    return mountComponent(dr);
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function drawerMenu(label: string) {
  return markup({
    className: 'p-4 space-y-2',
    render: () => html`<div class="text-sm font-semibold uppercase tracking-wide opacity-70">${label}</div>
      <ul class="menu menu-compact">
        <li><a>Dashboard</a></li>
        <li><a>Projects</a></li>
        <li><a>Reports</a></li>
        <li><a>Settings</a></li>
      </ul>`
  });
}

export const LeftBasic: Story = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.className = 'space-y-4';

    const dr = drawer({
      width: '18rem',
      content: [drawerMenu('Main navigation')]
    });

    const openBtn = button({
      text: 'Open drawer',
      color: 'primary',
      onClick: () => {
        dr.state().open = true;
      }
    });

    wrap.appendChild(mountComponent(openBtn));
    wrap.appendChild(mountComponent(dr));
    return wrap;
  }
};

export const RightWithBackdrop: Story = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.className = 'space-y-4';

    const dr = drawer({
      placement: 'right',
      backdrop: true,
      width: '20rem',
      content: [drawerMenu('Quick actions')]
    });

    const openBtn = button({
      text: 'Show actions',
      color: 'accent',
      onClick: () => {
        dr.state().open = true;
      }
    });

    const closeBtn = button({
      text: 'Close',
      variant: 'outline',
      onClick: () => {
        dr.state().open = false;
      }
    });

    const buttons = document.createElement('div');
    buttons.className = 'flex items-center gap-3';
    buttons.appendChild(mountComponent(openBtn));
    buttons.appendChild(mountComponent(closeBtn));

    wrap.appendChild(buttons);
    wrap.appendChild(mountComponent(dr));
    return wrap;
  }
};

export const Responsive: Story = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.className = 'space-y-4 max-w-sm';

    const dr = drawer({
      backdrop: true,
      width: '16rem',
      content: [drawerMenu('Mobile menu')]
    });

    const trigger = button({
      text: 'Toggle menu (resize viewport < 640px)',
      color: 'secondary',
      onClick: () => {
        dr.state().open = !dr.state().open;
      }
    });

    const helper = document.createElement('p');
    helper.className = 'text-sm text-base-content/70';
    helper.textContent = 'Open the drawer and press ESC or click the backdrop to close it.';

    wrap.appendChild(mountComponent(trigger));
    wrap.appendChild(helper);
    wrap.appendChild(mountComponent(dr));
    return wrap;
  }
};
