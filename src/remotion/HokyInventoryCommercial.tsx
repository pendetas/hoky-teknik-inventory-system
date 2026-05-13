import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  AlertTriangle,
  BarChart3,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Store,
  TrendingUp,
  Wrench,
} from 'lucide-react';

const orange = '#F27D26';
const red = '#FF4444';
const ink = '#090A0C';
const panel = '#151619';
const panel2 = '#1A1C21';
const border = '#2A2D35';
const text = '#E0E2E6';
const muted = '#8E9299';

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const sceneProgress = (frame: number, fps: number, from: number, to: number) =>
  interpolate(frame, [from * fps, to * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

const fadeUp = (frame: number, fps: number, delay = 0) => {
  const progress = sceneProgress(frame, fps, delay, delay + 0.7);
  return {
    opacity: progress,
    transform: `translateY(${interpolate(progress, [0, 1], [34, 0])}px)`,
  };
};

const countUp = (frame: number, fps: number, target: number, delay = 0, duration = 1.2) =>
  Math.round(
    interpolate(frame, [delay * fps, (delay + duration) * fps], [0, target], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }),
  );

const formatIdr = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

const Shell = ({ children }: { children: React.ReactNode }) => (
  <AbsoluteFill style={{ background: ink, color: text, fontFamily: 'Inter, Arial, sans-serif' }}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(circle at 12% 18%, rgba(242, 125, 38, 0.20), transparent 28%), linear-gradient(135deg, #090A0C 0%, #111318 48%, #090A0C 100%)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        opacity: 0.34,
      }}
    />
    {children}
  </AbsoluteFill>
);

const Brand = ({ compact = false }: { compact?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
    <div
      style={{
        width: compact ? 54 : 76,
        height: compact ? 54 : 76,
        display: 'grid',
        placeItems: 'center',
        background: orange,
        color: '#111',
      }}
    >
      <Wrench size={compact ? 28 : 40} strokeWidth={3} />
    </div>
    <div>
      <div style={{ color: orange, fontWeight: 900, fontSize: compact ? 22 : 34, fontStyle: 'italic' }}>
        HOKY TEKNIK
      </div>
      <div style={{ color: muted, fontSize: compact ? 12 : 16, letterSpacing: 5, fontWeight: 800 }}>
        INVENTORY SYSTEM
      </div>
    </div>
  </div>
);

const Sidebar = () => {
  const items = [
    [LayoutDashboard, 'Ringkasan'],
    [Package, 'Produk'],
    [ShoppingBag, 'Shopee'],
    [Store, 'Pengiriman Toko'],
    [FileSpreadsheet, 'Laporan'],
  ] as const;

  return (
    <div style={{ width: 280, background: '#090A0C', borderRight: `1px solid ${border}`, padding: 26 }}>
      <Brand compact />
      <div style={{ marginTop: 52, color: muted, fontSize: 12, fontWeight: 900, letterSpacing: 3 }}>MANAJEMEN</div>
      <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
        {items.map(([Icon, label], index) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 12px',
              borderLeft: index === 0 ? `3px solid ${orange}` : '3px solid transparent',
              color: index === 0 ? text : muted,
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: 1.7,
              textTransform: 'uppercase',
            }}
          >
            <Icon size={22} color={index === 0 ? text : muted} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  sub,
  accent = text,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) => (
  <div style={{ background: panel, border: `1px solid ${border}`, padding: 24, minHeight: 142 }}>
    <div style={{ color: muted, fontSize: 12, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ color: accent, fontSize: 42, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', marginTop: 10 }}>
      {value}
    </div>
    {sub ? <div style={{ color: muted, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginTop: 12 }}>{sub}</div> : null}
  </div>
);

const DashboardMock = ({ progress }: { progress: number }) => {
  const statScale = interpolate(progress, [0, 1], [0.94, 1]);
  return (
    <div
      style={{
        width: 1180,
        height: 690,
        display: 'flex',
        background: '#0F1115',
        border: `1px solid ${border}`,
        boxShadow: '0 28px 80px rgba(0,0,0,0.42)',
        transform: `scale(${statScale})`,
        transformOrigin: 'center',
      }}
    >
      <Sidebar />
      <div style={{ flex: 1, padding: 34 }}>
        <div style={{ borderBottom: `1px solid ${border}`, paddingBottom: 22, marginBottom: 26 }}>
          <div style={{ color: orange, fontSize: 14, letterSpacing: 6, fontWeight: 900 }}>KONTROL INVENTARIS</div>
          <div style={{ fontSize: 42, fontWeight: 900, fontStyle: 'italic', marginTop: 6 }}>RINGKASAN</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <StatCard label="Total Produk" value="128" />
          <StatCard label="Pendapatan Shopee" value="Rp 28.4Jt" sub="Order diterima + retur" />
          <StatCard label="Pendapatan Toko" value="Rp 16.8Jt" />
          <StatCard label="Order Retur" value="7" sub="2 kasus perlu dicek" accent={red} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 24 }}>
          <div style={{ background: panel, border: `1px solid ${border}`, padding: 22 }}>
            <div style={{ fontSize: 17, fontWeight: 900, fontStyle: 'italic', marginBottom: 20 }}>01 / AKTIVITAS TERBARU</div>
            {['Mesin Bor Impact x2', 'Kunci Pas Set x5', 'Bearing Mesin x12', 'Kabel Las x4'].map((item, index) => (
              <div
                key={item}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '54px 1fr 120px',
                  gap: 14,
                  alignItems: 'center',
                  borderBottom: `1px solid ${border}`,
                  padding: '13px 0',
                  opacity: interpolate(progress, [0.15 + index * 0.08, 0.45 + index * 0.08], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                }}
              >
                <div style={{ width: 46, height: 46, display: 'grid', placeItems: 'center', background: panel2, color: orange }}>
                  {index % 2 === 0 ? <ShoppingBag size={22} /> : <Store size={22} />}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900 }}>{item}</div>
                  <div style={{ color: muted, fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>SHOPEE - DIKIRIM</div>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 900 }}>Rp {(index + 4) * 420}.000</div>
              </div>
            ))}
          </div>
          <div style={{ background: panel, border: `1px solid ${border}`, padding: 22 }}>
            <div style={{ color: red, display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, fontWeight: 900 }}>
              <AlertTriangle size={22} /> PERINGATAN DATA
            </div>
            {['Filter Pompa', 'Seal Hidrolik', 'Mata Bor 8mm'].map((item, index) => (
              <div
                key={item}
                style={{
                  marginTop: 20,
                  padding: 14,
                  background: '#0F1115',
                  borderLeft: `3px solid ${red}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                <span>{item}</span>
                <span style={{ color: red }}>{index + 2} TERSISA</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const OpeningScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = sceneProgress(frame, fps, 0.2, 1.2);
  const dashboardReveal = sceneProgress(frame, fps, 1.3, 2.4);
  return (
    <Shell>
      <div style={{ position: 'absolute', left: 92, top: 80, ...fadeUp(frame, fps, 0.1) }}>
        <Brand />
      </div>
      <div style={{ position: 'absolute', left: 92, top: 270, width: 720 }}>
        <div style={{ color: orange, fontSize: 22, fontWeight: 900, letterSpacing: 5, ...fadeUp(frame, fps, 0.5) }}>
          COMMERCIAL DEMO
        </div>
        <h1
          style={{
            fontSize: 86,
            lineHeight: 0.92,
            fontWeight: 900,
            fontStyle: 'italic',
            margin: '18px 0',
            letterSpacing: 0,
            ...fadeUp(frame, fps, 0.7),
          }}
        >
          Inventory control built for daily operations.
        </h1>
        <p style={{ color: muted, fontSize: 26, lineHeight: 1.35, fontWeight: 700, ...fadeUp(frame, fps, 1) }}>
          Track stock, monitor sales channels, and prepare analytics reports from one focused system.
        </p>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 70,
          top: 190,
          opacity: reveal,
          transform: `translateX(${interpolate(dashboardReveal, [0, 1], [90, 0])}px) rotate(-3deg) scale(0.78)`,
        }}
      >
        <DashboardMock progress={dashboardReveal} />
      </div>
    </Shell>
  );
};

const InventoryScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = sceneProgress(frame, fps, 0, 1);
  const products: Array<[name: string, stock: number, bg: string]> = [
    ['Mesin Bor Impact', 24, '#30343C'],
    ['Kunci Pas Set', 48, '#2B3138'],
    ['Filter Pompa', 3, '#442028'],
    ['Seal Hidrolik', 2, '#442028'],
    ['Kabel Las', 31, '#2B3138'],
    ['Bearing Mesin', 19, '#30343C'],
  ];

  return (
    <Shell>
      <div style={{ position: 'absolute', left: 110, top: 98, width: 700, ...fadeUp(frame, fps, 0.1) }}>
        <div style={{ color: orange, fontSize: 18, fontWeight: 900, letterSpacing: 5 }}>INVENTORY CONTROL</div>
        <h2 style={{ fontSize: 68, lineHeight: 0.98, fontWeight: 900, fontStyle: 'italic', margin: '20px 0' }}>
          Know exactly what is moving, low, and ready.
        </h2>
      </div>
      <div style={{ position: 'absolute', left: 112, bottom: 110, display: 'flex', gap: 18 }}>
        {[
          ['128', 'Active SKUs'],
          ['5', 'Low stock alerts'],
          ['24/7', 'Live control'],
        ].map(([value, label], index) => (
          <div
            key={label}
            style={{
              width: 210,
              padding: 24,
              background: panel,
              border: `1px solid ${border}`,
              opacity: sceneProgress(frame, fps, 0.5 + index * 0.15, 1.1 + index * 0.15),
            }}
          >
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, color: index === 1 ? red : text, fontSize: 42 }}>
              {value}
            </div>
            <div style={{ color: muted, fontWeight: 900, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 110,
          top: 150,
          width: 820,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 18,
          transform: `translateY(${interpolate(progress, [0, 1], [38, 0])}px)`,
          opacity: progress,
        }}
      >
        {products.map(([name, stock, bg], index) => {
          const itemProgress = sceneProgress(frame, fps, 0.2 + index * 0.08, 0.9 + index * 0.08);
          return (
            <div
              key={name}
              style={{
                height: 250,
                background: panel,
                border: `1px solid ${border}`,
                overflow: 'hidden',
                opacity: itemProgress,
                transform: `translateY(${interpolate(itemProgress, [0, 1], [26, 0])}px)`,
              }}
            >
              <div style={{ height: 128, display: 'grid', placeItems: 'center', background: bg as string }}>
                <Package size={48} color={stock < 5 ? red : orange} />
              </div>
              <div style={{ padding: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase' }}>{name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
                  <span style={{ color: muted, fontSize: 12, fontWeight: 900, letterSpacing: 3 }}>STOK</span>
                  <span style={{ color: stock < 5 ? red : text, fontSize: 22, fontWeight: 900 }}>{stock}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
};

const OperationsScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flow = sceneProgress(frame, fps, 0.7, 2.4);
  const shopeeRevenue = countUp(frame, fps, 28400000, 1.1);
  const storeRevenue = countUp(frame, fps, 16800000, 1.3);

  return (
    <Shell>
      <div style={{ position: 'absolute', left: 108, top: 92, ...fadeUp(frame, fps, 0.1) }}>
        <div style={{ color: orange, fontSize: 18, fontWeight: 900, letterSpacing: 5 }}>SALES OPERATIONS</div>
        <h2 style={{ fontSize: 66, lineHeight: 1, fontWeight: 900, fontStyle: 'italic', margin: '20px 0', width: 760 }}>
          Online and store sales update the same inventory picture.
        </h2>
      </div>
      <div style={{ position: 'absolute', left: 180, bottom: 180, display: 'flex', alignItems: 'center', gap: 68 }}>
        {[
          [ShoppingBag, 'Shopee Orders', formatIdr(shopeeRevenue)],
          [Store, 'Store Shipments', formatIdr(storeRevenue)],
        ].map(([Icon, label, value], index) => (
          <div
            key={label as string}
            style={{
              width: 370,
              height: 210,
              background: panel,
              border: `1px solid ${border}`,
              padding: 28,
              opacity: sceneProgress(frame, fps, 0.4 + index * 0.3, 1.2 + index * 0.3),
            }}
          >
            <Icon size={42} color={orange} />
            <div style={{ marginTop: 28, color: muted, fontSize: 13, fontWeight: 900, letterSpacing: 3 }}>{label as string}</div>
            <div style={{ marginTop: 10, fontSize: 32, fontFamily: 'JetBrains Mono, monospace', fontWeight: 900 }}>{value as string}</div>
          </div>
        ))}
      </div>
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
        <path
          d="M 600 650 C 850 470, 1010 470, 1220 590"
          fill="none"
          stroke={orange}
          strokeWidth="5"
          strokeDasharray="18 16"
          opacity={0.45}
        />
        <circle cx={interpolate(flow, [0, 1], [600, 1220])} cy={interpolate(flow, [0, 1], [650, 590])} r="13" fill={orange} />
      </svg>
      <div
        style={{
          position: 'absolute',
          right: 124,
          top: 270,
          width: 500,
          background: panel,
          border: `1px solid ${border}`,
          padding: 30,
          ...fadeUp(frame, fps, 1.4),
        }}
      >
        <div style={{ color: orange, fontSize: 14, fontWeight: 900, letterSpacing: 4 }}>AUTOMATED CONTROL</div>
        {['Sale recorded', 'Stock reduced', 'Return tracked', 'Revenue updated'].map((item, index) => (
          <div
            key={item}
            style={{
              marginTop: 24,
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${border}`,
              paddingBottom: 16,
              color: sceneProgress(frame, fps, 1.6 + index * 0.25, 2 + index * 0.25) > 0.8 ? text : muted,
              fontWeight: 900,
              fontSize: 22,
            }}
          >
            <span>{item}</span>
            <span style={{ color: orange }}>OK</span>
          </div>
        ))}
      </div>
    </Shell>
  );
};

const AnalyticsScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chartProgress = sceneProgress(frame, fps, 0.7, 2.3);
  const bars = [0.42, 0.7, 0.55, 0.92, 0.78, 1];

  return (
    <Shell>
      <div style={{ position: 'absolute', left: 105, top: 90, width: 720, ...fadeUp(frame, fps, 0.1) }}>
        <div style={{ color: orange, fontSize: 18, fontWeight: 900, letterSpacing: 5 }}>ANALYTICS REPORT</div>
        <h2 style={{ fontSize: 68, lineHeight: 0.98, fontWeight: 900, fontStyle: 'italic', margin: '20px 0' }}>
          Weekly reports ready for action.
        </h2>
        <p style={{ color: muted, fontSize: 24, lineHeight: 1.35, fontWeight: 700 }}>
          Export store reports, Shopee performance, current stock, sales totals, and return cases.
        </p>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 110,
          top: 132,
          width: 850,
          height: 710,
          background: panel,
          border: `1px solid ${border}`,
          padding: 34,
          ...fadeUp(frame, fps, 0.3),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, fontStyle: 'italic' }}>LAPORAN TOKO MINGGUAN</div>
            <div style={{ color: muted, fontSize: 13, fontWeight: 900, letterSpacing: 3, marginTop: 8 }}>RINGKASAN + PENJUALAN + STOK</div>
          </div>
          <div style={{ background: orange, color: '#111', padding: '16px 20px', display: 'flex', gap: 10, fontWeight: 900 }}>
            <Download size={22} /> EXPORT XLSX
          </div>
        </div>
        <div style={{ height: 330, marginTop: 64, display: 'flex', alignItems: 'end', gap: 28, borderBottom: `2px solid ${border}` }}>
          {bars.map((bar, index) => {
            const grow = spring({ frame, fps, delay: 20 + index * 5, config: { damping: 180 } });
            return (
              <div key={index} style={{ flex: 1 }}>
                <div
                  style={{
                    height: 300 * bar * Math.min(grow, chartProgress),
                    background: index === 5 ? orange : '#343944',
                    borderTop: `5px solid ${index === 5 ? '#ffb36f' : '#596171'}`,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 42 }}>
          <StatCard label="Total Pendapatan" value="Rp 45.2Jt" />
          <StatCard label="Produk Terpantau" value="128" />
          <StatCard label="Retur Aktif" value="2" accent={red} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 108, bottom: 118, display: 'flex', alignItems: 'center', gap: 18, ...fadeUp(frame, fps, 1.5) }}>
        <BarChart3 size={46} color={orange} />
        <div style={{ fontSize: 28, fontWeight: 900 }}>Turn daily transactions into readable management reports.</div>
      </div>
    </Shell>
  );
};

const ClosingScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = sceneProgress(frame, fps, 1.2, 2.2);
  return (
    <Shell>
      <div style={{ position: 'absolute', left: 120, top: 120, ...fadeUp(frame, fps, 0.1) }}>
        <Brand />
      </div>
      <div style={{ position: 'absolute', left: 120, top: 335, width: 1150 }}>
        <h2 style={{ fontSize: 92, lineHeight: 0.96, fontWeight: 900, fontStyle: 'italic', margin: 0, ...fadeUp(frame, fps, 0.3) }}>
          Control stock. Track sales. Export reports.
        </h2>
        <p style={{ color: muted, fontSize: 30, fontWeight: 700, lineHeight: 1.35, marginTop: 34, ...fadeUp(frame, fps, 0.7) }}>
          A focused inventory and analytics system for HOKY TEKNIK operations.
        </p>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 170,
          bottom: 150,
          width: 260,
          height: 260,
          display: 'grid',
          placeItems: 'center',
          background: orange,
          color: '#111',
          transform: `scale(${interpolate(pulse, [0, 1], [0.9, 1])})`,
        }}
      >
        <TrendingUp size={112} strokeWidth={2.7} />
      </div>
    </Shell>
  );
};

export const HokyInventoryCommercial = () => (
  <AbsoluteFill style={{ background: ink }}>
    <Sequence from={0} durationInFrames={180}>
      <OpeningScene />
    </Sequence>
    <Sequence from={180} durationInFrames={180}>
      <InventoryScene />
    </Sequence>
    <Sequence from={360} durationInFrames={180}>
      <OperationsScene />
    </Sequence>
    <Sequence from={540} durationInFrames={180}>
      <AnalyticsScene />
    </Sequence>
    <Sequence from={720} durationInFrames={180}>
      <ClosingScene />
    </Sequence>
  </AbsoluteFill>
);
