import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { EmployeeDialog, EmployeeIcon } from "./EmployeeUI";
import { STAFF_SUSPENSION_EVENT, enforceStaffSuspension, getStaffSuspensionNotice, type StaffSuspensionNotice } from "@/lib/services/staffSuspension";
import s from "./StaffManagement.module.css";

/** Lives above route content so the suspension popup survives logout/redirect. */
export default function EmployeeSessionGuard() {
  const router = useRouter();
  const route = useRef(router);
  route.current = router;
  const [notice, setNotice] = useState<StaffSuspensionNotice | null>(null);
  useEffect(() => {
    const show = (event: Event) => {
      setNotice((event as CustomEvent<StaffSuspensionNotice>).detail);
      void route.current.replace("/staff?suspended=1");
    };
    window.addEventListener(STAFF_SUSPENSION_EVENT, show);
    let stopRecord: (() => void) | undefined;
    let generation = 0;
    const stopAuth = onAuthStateChanged(auth, user => {
      const current = ++generation;
      stopRecord?.(); stopRecord = undefined;
      const owner = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";
      if (!user || user.email?.toLowerCase() === owner.toLowerCase()) return;
      stopRecord = onSnapshot(doc(db, "staff_members", user.uid), snapshot => {
        if (current !== generation || !snapshot.exists() || snapshot.data().status !== "suspended") return;
        void enforceStaffSuspension({ id: snapshot.id, ...snapshot.data() }).catch(() => {}).finally(() => { void route.current.replace("/staff?suspended=1"); });
      }, () => {});
    });
    return () => { generation++; stopAuth(); stopRecord?.(); window.removeEventListener(STAFF_SUSPENSION_EVENT, show); };
  }, []);
  useEffect(() => {
    if (router.isReady && router.query.suspended === "1") setNotice(current => current || getStaffSuspensionNotice());
  }, [router.isReady, router.query.suspended]);
  if (!notice) return null;
  const close = () => { setNotice(null); void router.replace("/staff", undefined, { shallow: true }); };
  return <EmployeeDialog title="Account suspended" description="You have been signed out of the employee workspace." icon="block" onClose={close}>
    <div className={s.suspensionNotice}><strong>Reason for suspension</strong><p>{notice.reason}</p></div>
    <p className={s.help}>Please contact administration to discuss your account and restore access.</p>
    <div className={s.dialogActions}><button className={s.primary} onClick={close}><EmployeeIcon>login</EmployeeIcon>Back to sign in</button></div>
  </EmployeeDialog>;
}
