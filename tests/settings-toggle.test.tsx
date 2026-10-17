// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingToggle } from '../apps/web/src/components/settings/SettingToggle';

afterEach(cleanup);

describe('SettingToggle',()=>{
  it('exposes its controlled state to keyboard and assistive technologies',()=>{
    const onToggle=vi.fn();
    const renderToggle=(checked:boolean)=><SettingToggle
      title="动态效果预览" description="随时开启或关闭" checked={checked} onToggle={onToggle}
    />;
    const view=render(renderToggle(false));
    const control=screen.getByRole('button',{name:/动态效果预览/});
    expect(control.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(control);
    expect(onToggle).toHaveBeenCalledTimes(1);
    view.rerender(renderToggle(true));
    expect(control.getAttribute('aria-pressed')).toBe('true');
    expect(control.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
