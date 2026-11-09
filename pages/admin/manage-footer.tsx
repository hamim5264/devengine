import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ManageFooterRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/manage-landing?tab=footer");
  }, [router]);

  return null;
}

