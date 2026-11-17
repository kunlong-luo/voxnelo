// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { FIRST_SENTENCE, SENTENCES } from '@voxnelo/learning';
import { LibraryView } from '../apps/web/src/LibraryView';
import { I18nProvider } from '../apps/web/src/i18n';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('F104 dated review library', () => {
  it('filters due/upcoming items and records self-confirmation without pretending to make a recording', () => {
    const now=Date.UTC(2026,10,17,12);
    vi.spyOn(Date,'now').mockReturnValue(now);
    const onCompleteReview=vi.fn();
    const states=[
      {sentenceId:FIRST_SENTENCE.id,seenCount:1,practicedCount:0,review:true,favorite:false,
        lastSeenAt:now,reviewStep:0,nextReviewAt:now},
      {sentenceId:SENTENCES[1]!.id,seenCount:1,practicedCount:2,review:true,favorite:false,
        lastSeenAt:now,reviewStep:2,nextReviewAt:now+86_400_000},
    ];
    const ui=render(<I18nProvider locale="zh-CN"><LibraryView view="review" states={states}
      events={[]} search="" notice="" onSearch={vi.fn()} onChoose={vi.fn()}
      onBackToPractice={vi.fn()} onCompleteReview={onCompleteReview}/></I18nProvider>);
    const filters=screen.getByRole('group',{name:'按复习时间筛选'});
    expect(within(filters).getByRole('button',{name:'全部 2'})).toBeTruthy();
    expect(within(filters).getByRole('button',{name:'已到期 1'})).toBeTruthy();
    expect(within(filters).getByRole('button',{name:'稍后复习 1'})).toBeTruthy();
    expect(ui.container.querySelectorAll('.libraryItem')).toHaveLength(2);
    fireEvent.click(within(filters).getByRole('button',{name:'已到期 1'}));
    expect(ui.container.querySelectorAll('.libraryItem')).toHaveLength(1);
    expect(screen.getByRole('button',{name:'已跟读 '+FIRST_SENTENCE.english+'，安排下次复习'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'已跟读 '+FIRST_SENTENCE.english+'，安排下次复习'}));
    expect(onCompleteReview).toHaveBeenCalledOnce();
    expect(onCompleteReview).toHaveBeenCalledWith(FIRST_SENTENCE.id);
    fireEvent.click(within(filters).getByRole('button',{name:'稍后复习 1'}));
    expect(ui.container.querySelectorAll('.libraryItem')).toHaveLength(1);
    expect(screen.getByText('下次复习：')).toBeTruthy();
    expect(screen.queryByRole('button',{name:/已跟读.*安排下次复习/})).toBeNull();
  });

  it('does not show fabricated review completion when parent does not supply a handler', () => {
    vi.spyOn(Date,'now').mockReturnValue(Date.UTC(2026,10,17,12));
    render(<I18nProvider locale="zh-CN"><LibraryView view="review"
      states={[{sentenceId:FIRST_SENTENCE.id,seenCount:0,practicedCount:0,
        favorite:false,review:true,lastSeenAt:Date.now()}]}
      events={[]} search="" notice="" onSearch={()=>undefined} onChoose={()=>undefined}
      onBackToPractice={()=>undefined}/></I18nProvider>);
    expect(screen.getByText('现在可以复习')).toBeTruthy();
    expect(screen.queryByRole('button',{name:/安排下次复习/})).toBeNull();
  });
});
