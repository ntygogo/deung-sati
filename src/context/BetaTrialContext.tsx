import { createContext, useContext, useEffect, useCallback, useRef, useState, type ReactNode } from 'react';
import type { BetaTrialStatus } from '../shared/betaTrial';
import { authHeaders } from '../utils/authHeaders';
interface TrialContext {
  trial: BetaTrialStatus | null; error: string; canChat: boolean;
  refresh: () => Promise<void>; expressInterest: () => Promise<void>;
}
const Context = createContext<TrialContext | null>(null);
export function BetaTrialProvider({ children }: {children: ReactNode}) {
  const [trial,setTrial] = useState<BetaTrialStatus | null>(null);
  const [error,setError] = useState('');
  const [checkedAt,setCheckedAt] = useState(Date.now());
  const alive = useRef(true);
  const request = useCallback(async (path:string,method='GET') => {
    try {
      const res=await fetch('/api/beta/'+path,{method,credentials:'include',headers:authHeaders()});
      if(!res.ok) throw new Error('ยังตรวจสอบสิทธิ์ไม่ได้ กรุณาลองอีกครั้ง');
      const data = await res.json() as BetaTrialStatus;
      if(alive.current) {setTrial(data);setError('');setCheckedAt(Date.now());}
    } catch(e) { if(alive.current) setError((e as Error).message); }
  },[]);
  const refresh=useCallback(()=>request('status'),[request]);
  useEffect(()=>{
    alive.current=true; void refresh();
    const update=()=>void refresh();
    const timer=window.setInterval(()=>{setCheckedAt(Date.now());void refresh();},30000);
    window.addEventListener('beta-trial-change',update);window.addEventListener('focus',update);
    return()=>{alive.current=false;clearInterval(timer);window.removeEventListener('beta-trial-change',update);window.removeEventListener('focus',update);};
  },[refresh]);
  const expired=trial?.state==='expired'||!!(trial?.expiresAt&&new Date(trial.expiresAt).getTime()<=checkedAt);
  const current=trial&&expired?{...trial,state:'expired' as const,daysRemaining:0}:trial;
  return <Context.Provider value={{trial:current,error,canChat:!!current&&!expired&&!error,refresh,expressInterest:()=>request('interest','POST')}}>{children}</Context.Provider>;
}
export function useBetaTrial(){const value=useContext(Context);if(!value)throw new Error('Missing beta provider');return value;}

