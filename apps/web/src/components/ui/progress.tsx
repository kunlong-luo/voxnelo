import { cn } from '../../lib/utils';
export function Progress({value=0,max=100,label,className}:{
  value?:number;max?:number;label:string;className?:string;
}) {
  const normalized = max>0 ? Math.max(0,Math.min(100,value/max*100)) : 0;
  return <div data-slot="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.max(0,Math.min(max,value))} className={cn('h-2 overflow-hidden rounded-full bg-primary/10',className)}>
    <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{width:normalized+'%'}}/>
  </div>;
}
