import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
export async function appos<T = { saved: boolean }>(action: string, input: Record<string, unknown> = {}): Promise<T> {
  return (await httpsCallable<Record<string, unknown>,T>(getFunctions(app,'us-central1'),'apposManage',{timeout:125000})({action,...input})).data;
}
export function apposError(error: unknown) { const e=error as {code?:string;message?:string}; return e.code?.startsWith('functions/')&&e.message&&e.message!=='INTERNAL'?e.message:'AppOS could not complete the request. Please try again.'; }
