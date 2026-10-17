// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '../apps/web/src/i18n';
import { CatalogView } from '../apps/web/src/CatalogView';
import { SCENE_LABELS, SENTENCES } from '@voxnelo/content';

afterEach(cleanup);
const setup=()=> {
  const onChoose=vi.fn(), onBackToPractice=vi.fn();
  const view=render(<I18nProvider locale="zh-CN"><CatalogView onChoose={onChoose} onBackToPractice={onBackToPractice}/></I18nProvider>);
  return {...view,onChoose,onBackToPractice};
};

describe('Voxnelo searchable course catalog',()=>{
  it('shows the expanded catalog and paginates at six expressions per page',()=>{
    const view=setup();
    expect(SENTENCES).toHaveLength(280);
    expect(screen.getByTestId('catalog-count').textContent).toContain('280');
    expect(view.container.querySelectorAll('.catalogItem')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button',{name:'下一页'}));
    expect(view.container.querySelectorAll('.catalogItem')).toHaveLength(6);
    expect(screen.getByRole('navigation',{name:'句子列表分页'}).textContent).toContain('2 / 47');
  });
  it('filters scenes without losing original stable sentence IDs',()=>{
    const view=setup();
    const scene=screen.getByRole('group',{name:'按场景筛选句子'});
    fireEvent.click(within(scene).getByRole('button',{name:'餐厅点餐'}));
    expect(view.container.querySelectorAll('.catalogItem')).toHaveLength(6);
    const dish=SENTENCES.find(item=>item.english==="I'd like a table for two.");
    expect(dish?.id).toBe('s101');
    fireEvent.click(screen.getByRole('button',{name:/I'd like a table for two/}));
    expect(view.onChoose).toHaveBeenCalledWith(expect.objectContaining({id:'s101',scene:'dining'}));
    expect(Object.keys(SCENE_LABELS)).toHaveLength(13);
  });
  it('searches bilingual source text and resets result pagination',()=>{
    const view=setup();
    fireEvent.click(screen.getByRole('button',{name:'下一页'}));
    fireEvent.change(screen.getByRole('searchbox',{name:'搜索英文或中文句子…'}),{target:{value:'洗衣服'}});
    expect(view.container.querySelectorAll('.catalogItem')).toHaveLength(1);
    expect(screen.getByText('I do my laundry on weekends.')).toBeTruthy();
    expect(screen.queryByRole('navigation',{name:'句子列表分页'})).toBeNull();
    fireEvent.change(screen.getByRole('searchbox',{name:'搜索英文或中文句子…'}),{target:{value:'unfindable expression'}});
    expect(view.container.querySelectorAll('.catalogItem')).toHaveLength(0);
    expect(screen.getByText('没有找到匹配的短句，换个关键词试试。')).toBeTruthy();
  });
});
