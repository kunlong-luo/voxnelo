// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { APP_VERSION } from '@voxnelo/learning';
import { I18nProvider } from '../apps/web/src/i18n';
import { MobileNavigation, NavigationSidebar } from '../apps/web/src/AppNavigation';

afterEach(cleanup);

describe('Shared app navigation components',()=>{
  it('renders desktop navigation and current route, favorite count, and app version',()=>{
    const navigate=vi.fn();
    const {container}=render(<I18nProvider locale="zh-CN">
      <NavigationSidebar view="favorites" favorites={3} onNavigate={navigate}/>
    </I18nProvider>);
    const nav=screen.getByRole('navigation',{name:'主导航'});
    expect(nav.querySelectorAll('button')).toHaveLength(6);
    expect(screen.getByRole('button',{name:'我的收藏'}).getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('3')).toBeTruthy();
    expect(container.querySelector('.sidebarVersion')?.textContent).toContain(APP_VERSION);
    fireEvent.click(screen.getByRole('button',{name:'设置'}));
    expect(navigate).toHaveBeenCalledWith('settings');
  });

  it('keeps compact navigation labels and current state synchronized with the desktop menu',()=>{
    const navigate=vi.fn();
    render(<I18nProvider locale="en-US">
      <MobileNavigation view="practice" onNavigate={navigate}/>
    </I18nProvider>);
    const nav=screen.getByRole('navigation',{name:'Main navigation'});
    expect(nav.querySelectorAll('button')).toHaveLength(6);
    expect(screen.getByRole('button',{name:'Start practice · Main navigation'}).getAttribute('aria-current')).toBe('page');
    fireEvent.click(screen.getByRole('button',{name:'Review list · Main navigation'}));
    expect(navigate).toHaveBeenCalledWith('review');
  });
});
