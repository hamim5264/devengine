import { useEffect, useMemo, useState } from "react";
import type { HubStatusType, NetworkHub } from "@/types/network";
import { getNetworkHubs, DEFAULT_NETWORK_METRICS } from "@/lib/services/networkService";
import styles from "@/components/system/SystemPanels.module.css";

interface NetworkTopologyBodyProps {
  initialHubs?: NetworkHub[];
  embedded?: boolean;
}

const REGION_POSITIONS = [
  { prefix: "AP-NORTHEAST", x: 85, y: 38 },
  { prefix: "AP-SOUTHEAST", x: 87, y: 78 },
  { prefix: "AP-SOUTH", x: 69, y: 49 },
  { prefix: "US-WEST", x: 19, y: 38 },
  { prefix: "US-EAST", x: 28, y: 39 },
  { prefix: "EU", x: 51, y: 32 },
  { prefix: "SA", x: 37, y: 76 },
];
const STATUS_LABELS: Record<HubStatusType, string> = {
  ONLINE: "Online", SYNCING: "Syncing", MAINTENANCE: "Maintenance", DEGRADED: "Degraded",
};

function mapPosition(hub: NetworkHub, index: number) {
  const fallback = REGION_POSITIONS.find((region) => hub.regionCode.toUpperCase().startsWith(region.prefix)) || {
    x: 20 + (index % 5) * 15, y: 35 + (index % 3) * 16,
  };
  // Missing coordinates are normalized to the map center by the existing service.
  const custom = hub.coordinates && !(hub.coordinates.x === 50 && hub.coordinates.y === 50);
  const x = custom ? hub.coordinates!.x : fallback.x;
  const y = custom ? hub.coordinates!.y : fallback.y;
  return {
    ...hub,
    x: Math.max(6, Math.min(94, Number.isFinite(x) ? x : fallback.x)) * 10,
    y: Math.max(8, Math.min(92, Number.isFinite(y) ? y : fallback.y)) * 5,
  };
}

export default function NetworkTopologyBody({ initialHubs, embedded = false }: NetworkTopologyBodyProps) {
  const [hubs, setHubs] = useState<NetworkHub[]>(initialHubs || []);
  const [loading, setLoading] = useState(!initialHubs);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [hoveredHubId, setHoveredHubId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getNetworkHubs().then((data) => { if (active) setHubs(data); })
      .catch((error) => console.warn("Failed to load network hubs:", error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const nodes = useMemo(() => hubs.map(mapPosition), [hubs]);
  const arcs = useMemo(() => nodes.slice(1).map((node, index) => {
    const origin = nodes[index % 2 === 0 ? 0 : index];
    return `M ${origin.x} ${origin.y} Q ${(origin.x + node.x) / 2} ${Math.min(origin.y, node.y) - 55} ${node.x} ${node.y}`;
  }), [nodes]);
  const selectedHub = hubs.find((hub) => hub.id === (hoveredHubId || selectedHubId));
  const onlineCount = hubs.filter((hub) => hub.isOnline && hub.status === "ONLINE").length;
  const onlinePercent = hubs.length ? Math.round(onlineCount / hubs.length * 100) : 0;
  const avgLatency = hubs.length ? Math.round(hubs.reduce((sum, hub) => sum + hub.latencyMs, 0) / hubs.length) : 0;

  return (
    <section className={styles.page} data-embedded={embedded} aria-labelledby="network-heading">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Connected across the world</p>
        <h1 id="network-heading" className={styles.title}>Global Network</h1>
        <p className={styles.subtitle}>Explore regional hubs, connectivity, and routing activity. Select a region to see its details.</p>
      </div>

      <div className={styles.networkGrid}>
        <div className={`${styles.surface} ${styles.mapPanel}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Global connectivity</h2>
            <span className={styles.badge}>{loading ? "Connecting…" : `${avgLatency}ms average latency`}</span>
          </div>

          <div className={styles.mapFrame}>
            <svg className={styles.worldMap} viewBox="0 0 1000 500" aria-label="Interactive regional network map">
              <g className={styles.continents} aria-hidden="true">
                <path d="M 120 90 Q 210 60 300 80 Q 320 140 270 230 Q 210 240 180 180 Q 120 130 120 90 Z" />
                <path d="M 280 270 Q 370 280 390 340 Q 360 450 310 470 Q 270 380 280 270 Z" />
                <path d="M 460 90 Q 560 80 580 140 Q 540 200 480 190 Q 450 140 460 90 Z" />
                <path d="M 470 210 Q 580 210 590 300 Q 550 420 480 390 Q 440 280 470 210 Z" />
                <path d="M 600 70 Q 820 60 880 160 Q 840 280 720 280 Q 640 200 600 70 Z" />
                <path d="M 790 340 Q 900 330 910 410 Q 840 450 780 410 Q 770 360 790 340 Z" />
              </g>
              {arcs.map((arc, index) => <g key={index} aria-hidden="true">
                <path d={arc} className={styles.arc} strokeDasharray="5 5" />
                <circle r="4" className={styles.packet}>
                  <animateMotion path={arc} dur={`${3 + index % 3}s`} repeatCount="indefinite" />
                </circle>
              </g>)}
              {nodes.map((node) => <g
                key={node.id}
                className={styles.node}
                data-status={node.status}
                data-active={selectedHub?.id === node.id}
                role="button"
                tabIndex={0}
                aria-label={`${node.name}, ${STATUS_LABELS[node.status] || node.status}, ${node.latencyMs} milliseconds latency`}
                aria-pressed={selectedHubId === node.id}
                onClick={() => setSelectedHubId(node.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedHubId(node.id); }
                }}
                onMouseEnter={() => setHoveredHubId(node.id)}
                onMouseLeave={() => setHoveredHubId(null)}
              >
                <circle cx={node.x} cy={node.y} r="28" fill="transparent" />
                <circle cx={node.x} cy={node.y} r="18" className={styles.nodeHalo} />
                <circle cx={node.x} cy={node.y} r="9" className={styles.nodeRing} />
                <circle cx={node.x} cy={node.y} r="4" fill="currentColor" />
                <text x={node.x} y={node.y - 28} textAnchor="middle" className={styles.mapLabel}>{node.latencyMs}ms</text>
              </g>)}
            </svg>
            <div className={styles.mapCaption}><span>Regional routing overview</span><span>{hubs.length} configured hubs</span></div>
          </div>

          <div className={styles.hubDetail}>
            {selectedHub ? <>
              <div><strong>{selectedHub.name}</strong><p>{selectedHub.regionCode} · {selectedHub.latencyMs}ms latency · {selectedHub.loadPercent}% load</p></div>
              <span className={styles.status} data-status={selectedHub.status}><span className={styles.statusDot} />{STATUS_LABELS[selectedHub.status] || selectedHub.status}</span>
            </> : <p>Select a point on the map or a region below to explore its connection.</p>}
          </div>
        </div>

        <div className={styles.metrics}>
          <div className={`${styles.surface} ${styles.metric}`}>
            <h2 className={styles.metricLabel}>Active nodes</h2>
            <p className={styles.metricValue} data-accent="true">{loading ? "—" : `${onlineCount}/${hubs.length}`}</p>
            <p className={styles.metricNote}>Regions currently online</p>
            <div className={styles.metricTrack}><span style={{ width: `${onlinePercent}%` }} /></div>
          </div>
          <div className={`${styles.surface} ${styles.metric}`}>
            <h2 className={styles.metricLabel}>Throughput</h2>
            <p className={styles.metricValue}>{DEFAULT_NETWORK_METRICS.throughput}</p>
            <p className={styles.metricNote}>{DEFAULT_NETWORK_METRICS.throughputChange}</p>
          </div>
          <div className={`${styles.surface} ${styles.metric}`}>
            <h2 className={styles.metricLabel}>Packet loss</h2>
            <p className={styles.metricValue} data-accent="true">{DEFAULT_NETWORK_METRICS.packetLoss}</p>
            <p className={styles.metricNote}>{DEFAULT_NETWORK_METRICS.packetLossState.replaceAll("_", " ").toLowerCase()}</p>
          </div>
        </div>
      </div>

      <section className={`${styles.surface} ${styles.hubsPanel}`} aria-labelledby="regional-hubs-heading">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} id="regional-hubs-heading">Regional hub status</h2>
          <span className={styles.badge}>{hubs.length} regions</span>
        </div>
        {loading ? <div className={styles.skeletons} role="status" aria-label="Loading network regions">
          {[1, 2, 3].map((item) => <div className={styles.skeleton} key={item} />)}
        </div> : hubs.length === 0 ? <p className={styles.empty}>No regional hubs are configured yet.</p> : <div className={styles.hubList}>
          {hubs.map((hub) => <button
            key={hub.id}
            type="button"
            className={styles.hubRow}
            aria-pressed={selectedHubId === hub.id}
            onClick={() => setSelectedHubId((current) => current === hub.id ? null : hub.id)}
          >
            <span className={styles.hubName}><span className="material-symbols-outlined" aria-hidden="true">dns</span><span>{hub.name}</span></span>
            <span className={styles.regionCode}>{hub.regionCode}</span>
            <span><span className={styles.badge} data-status={hub.status}>{hub.uptimeText}</span></span>
            <span className={`${styles.status} ${styles.hubStatus}`} data-status={hub.status}><span className={styles.statusDot} />{STATUS_LABELS[hub.status] || hub.status}</span>
            {selectedHubId === hub.id && <span className={styles.hubInlineDetails}>{hub.latencyMs}ms latency · {hub.loadPercent}% load</span>}
          </button>)}
        </div>}
      </section>
    </section>
  );
}
