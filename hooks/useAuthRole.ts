// hooks/useAuthRole.ts
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const ADMIN_EMAIL = "hamim.leon@gmail.com";

export function useAuthRole() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() =>
    typeof window !== "undefined" ? localStorage.getItem("isAdmin") === "1" : false
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      const admin = !!u && u.email === ADMIN_EMAIL;
      setIsAdmin(admin);
      if (typeof window !== "undefined") {
        if (admin) localStorage.setItem("isAdmin", "1");
        else localStorage.removeItem("isAdmin");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, isAdmin, loading };
}
