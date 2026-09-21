import React, { useEffect, useState } from "react";
import Head from "next/head";
import MaintenanceScreen from "@/components/maintenance/MaintenanceScreen";
import { MaintenanceConfig, DEFAULT_MAINTENANCE_CONFIG } from "@/types/maintenance";
import { getMaintenanceConfig, subscribeMaintenanceConfig } from "@/lib/services/maintenanceService";

export default function MaintenancePage() {
  const [config, setConfig] = useState<MaintenanceConfig>(DEFAULT_MAINTENANCE_CONFIG);

  useEffect(() => {
    // Initial fetch
    getMaintenanceConfig().then((data) => {
      setConfig(data);
    });

    // Real-time updates subscription
    const unsubscribe = subscribeMaintenanceConfig((updated) => {
      setConfig(updated);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <Head>
        <title>System Maintenance | DevEngine Core</title>
        <meta
          name="description"
          content="DevEngine Core is currently undergoing scheduled maintenance to deploy architectural enhancements."
        />
      </Head>
      <MaintenanceScreen config={config} />
    </>
  );
}
