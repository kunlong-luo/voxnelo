import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface SettingToggleProps {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

/** Reusable controlled preference control with explicit pressed state. */
export function SettingToggle({title,description,checked,onToggle}:SettingToggleProps){
  return (
    <Button
      variant="ghost"
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      className="settingToggle h-auto w-full justify-between gap-4 whitespace-normal rounded-2xl border border-border/70 bg-muted/50 p-4 text-left transition hover:bg-secondary/50"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <strong className="text-xs text-foreground">{title}</strong>
        <small className="text-[10px] leading-5 text-muted-foreground">{description}</small>
      </span>
      <span aria-hidden="true" className={cn('switchTrack relative inline-flex h-6 w-11 shrink-0 rounded-full border border-border/50 p-0.5 transition-colors',checked?'bg-primary':'bg-muted-foreground/30')}>
        <span className={cn('size-5 rounded-full bg-white shadow-sm transition-transform',checked&&'translate-x-5')}/>
      </span>
    </Button>
  );
}
