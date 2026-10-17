import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
const root=path.resolve('.');
const legacy=['styles.css','nordic.css','sunset.css','sunset-polish.css','workspace-layout.css','u3-polish.css'];
const entry=readFileSync(path.join(root,'apps/web/src/main.tsx'),'utf8');
if (!entry.includes("import './design-system.css'")) throw new Error('Missing new Tailwind design-system entry');
for (const old of legacy) {
  if (existsSync(path.join(root,'apps/web/src',old))) throw new Error('Legacy hand-written CSS still exists: '+old);
  if (entry.includes("'./"+old+"'")) throw new Error('Legacy CSS import found: '+old);
}
const css=readFileSync(path.join(root,'apps/web/src/design-system.css'),'utf8');
if(!css.includes('@import "tailwindcss"')||!css.includes('@theme inline')) throw new Error('Tailwind v4 token definition missing');
if(!css.includes(':root[data-motion="off"]'))throw new Error('Manual motion opt-out missing');
for(const token of ['#F8DEC5','#E8D3C7','#D8C3B9','#DD6B20','#ED8936','#F7F8F5','#E8F0EA','#A6C5BA','--animate-ribbon-flow']) {
 if(!css.includes(token))throw new Error('Design theme token missing: '+token);
}
for(const file of ['button.tsx','card.tsx','badge.tsx','progress.tsx']){
 if(!existsSync(path.join(root,'apps/web/src/components/ui',file)))throw new Error('Missing UI component: '+file);
}
const tooltip=readFileSync(path.join(root,'apps/web/src/Tooltip.tsx'),'utf8');
if(!tooltip.includes('@base-ui/react/tooltip') || !tooltip.includes('Tooltip.Portal')) throw new Error('Tooltip must use Base UI portal positioning');
const all=['App.tsx','PracticeView.tsx','SettingsView.tsx','LibraryView.tsx','RecordingPlayback.tsx','DesktopTitlebar.tsx','ErrorBoundary.tsx'];
for(const file of all){
 const source=readFileSync(path.join(root,'apps/web/src',file),'utf8');
 if(/\stitle=(?:"|\{)/.test(source))throw new Error('Native title tooltip is prohibited: '+file);
}
console.log('shadcn/Base UI + Tailwind v4 architecture check passed.');
