import { serverTimestamp, setDoc, updateDoc, type DocumentData, type DocumentReference, type SetOptions } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
// Metadata is used for event routing, never to authorize a write. Rules bind it to the caller.
const stamp = () => ({ studioActorUid: auth.currentUser?.uid || '', studioEventAt: serverTimestamp() });
export function setStaffEvent(ref: DocumentReference, data: DocumentData, options?: SetOptions) {
  const record = { ...data, ...stamp() };
  return options ? setDoc(ref, record, options) : setDoc(ref, record);
}
export function updateStaffEvent(ref: DocumentReference, data: DocumentData) {
  return updateDoc(ref, { ...data, ...stamp() });
}
