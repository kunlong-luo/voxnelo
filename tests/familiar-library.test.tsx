// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { FIRST_SENTENCE, SENTENCES, type LearningState } from '@voxnelo/learning';
import { LibraryView } from '../apps/web/src/LibraryView';
import { I18nProvider } from '../apps/web/src/i18n';

afterEach(()=>{cleanup();vi.restoreAllMocks();});
const first=FIRST_SENTENCE;
const second=SENTENCES[1]!;
const row=(sentenceId:string, fields:Partial<LearningState>):LearningState=>({
  sentenceId, seenCount:0,practicedCount:0,favorite:false,review:false,lastSeenAt:1,...fields,
});
const listProps={
  view:'favorites' as const,events:[],search:'',notice:'',
  onSearch:vi.fn(),onChoose:vi.fn(),onBackToPractice:vi.fn(),
};

describe('F106 library familiarity filter',()=>{
  it('shows separate favorites/familiar tabs, supports search and no inferred grades',()=>{
    const states=[row(first.id,{favorite:true}),row(second.id,{familiar:true})];
    const {container}=render(<I18nProvider locale="zh-CN">
      <LibraryView {...listProps} states={states}/>
    </I18nProvider>);
    const group=screen.getByRole('group',{name:'收藏与已熟悉筛选'});
    const favorites=within(group).getByRole('button',{name:'我的收藏'});
    const familiar=within(group).getByRole('button',{name:'已熟悉'});
    expect(favorites.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelectorAll('.libraryItem')).toHaveLength(1);
    expect(screen.getByText(first.english)).toBeTruthy();
    fireEvent.click(familiar);
    expect(familiar.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('heading',{name:'我已熟悉的短句'})).toBeTruthy();
    expect(screen.getByText(second.english)).toBeTruthy();
    expect(screen.queryByText(first.english)).toBeNull();
    expect(within(group).getByText(/手动标记/)).toBeTruthy();
    fireEvent.click(favorites);
    expect(screen.getByText(first.english)).toBeTruthy();
  });
  it('does not assume recordings mean familiar',()=>{
    render(<I18nProvider locale="en-US">
      <LibraryView {...listProps} states={[row(first.id,{practicedCount:100,favorite:true})]}/>
    </I18nProvider>);
    fireEvent.click(screen.getByRole('button',{name:'Familiar'}));
    expect(screen.getByRole('heading',{name:'Phrases I know'})).toBeTruthy();
    expect(screen.queryByText(first.english)).toBeNull();
  });
});