/**
 * The app may stay open while a user explicitly installs an offline language pack.
 * A UI-only capabilities refresh must therefore re-resolve verified native assets
 * in Electron's main process. Never replace a running native session.
 *
 * The caller supplies a resolver which performs the full byte/hash verification;
 * this helper never weakens that check or accepts any renderer paths.
 */
export interface RefreshableAsr {
  capabilities():{available:boolean};
  hasActiveSession():boolean;
}

export class RefreshableAsrEngine<T extends RefreshableAsr> {
  private pending:Promise<void>|null=null;
  constructor(
    private engine:T,
    private readonly loadVerified:()=>Promise<T>,
  ){}

  current():T{return this.engine;}

  async refreshIfUnavailable():Promise<T> {
    if(this.engine.capabilities().available||this.engine.hasActiveSession())return this.engine;
    if(!this.pending){
      this.pending=this.loadVerified().then(candidate=>{
        // Another renderer may have begun a session while assets were hashed.
        if(!this.engine.hasActiveSession())this.engine=candidate;
      }).finally(()=>{this.pending=null;});
    }
    await this.pending;
    return this.engine;
  }
}
