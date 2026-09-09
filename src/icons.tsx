import React from "react";

type IconProps = { size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties };

const Icon = ({
  d,
  size = 16,
  className = "",
  strokeWidth = 1.5,
  viewBox = "0 0 24 24",
  fill = false,
  style,
}: IconProps & { d: string | React.ReactNode; viewBox?: string; fill?: boolean }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill={fill ? "currentColor" : "none"}
    stroke={fill ? "none" : "currentColor"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

export const ShieldIcon = (p: IconProps) => (
  <Icon {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
);

export const LayoutIcon = (p: IconProps) => (
  <Icon {...p} d={<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>} />
);

export const VideoIcon = (p: IconProps) => (
  <Icon {...p} d={<><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>} />
);

export const AlertTriangleIcon = (p: IconProps) => (
  <Icon {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
);

export const MapPinIcon = (p: IconProps) => (
  <Icon {...p} d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 10a1 1 0 100-2 1 1 0 000 2z" />
);

export const UsersIcon = (p: IconProps) => (
  <Icon {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
);

export const BarChartIcon = (p: IconProps) => (
  <Icon {...p} d={<><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>} />
);

export const SettingsIcon = (p: IconProps) => (
  <Icon {...p} d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
);

export const BellIcon = (p: IconProps) => (
  <Icon {...p} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p} d={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />
);

export const XIcon = (p: IconProps) => (
  <Icon {...p} d="M18 6L6 18M6 6l12 12" />
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p} d="M20 6L9 17l-5-5" />
);

export const EyeIcon = (p: IconProps) => (
  <Icon {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z" />
);

export const ActivityIcon = (p: IconProps) => (
  <Icon {...p} d="M22 12h-4l-3 9L9 3l-3 9H2" />
);

export const ClockIcon = (p: IconProps) => (
  <Icon {...p} d={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />
);

export const FilterIcon = (p: IconProps) => (
  <Icon {...p} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p} d="M12 5v14M5 12h14" />
);

export const EditIcon = (p: IconProps) => (
  <Icon {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p} d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>} />
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p} d="M9 18l6-6-6-6" />
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p} d="M6 9l6 6 6-6" />
);

export const CameraIcon = (p: IconProps) => (
  <Icon {...p} d={<><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></>} />
);

export const WifiOffIcon = (p: IconProps) => (
  <Icon {...p} d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
);

export const MaximizeIcon = (p: IconProps) => (
  <Icon {...p} d={<><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></>} />
);

export const RefreshIcon = (p: IconProps) => (
  <Icon {...p} d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
);

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
);

export const InfoIcon = (p: IconProps) => (
  <Icon {...p} d={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>} />
);

export const ZapIcon = (p: IconProps) => (
  <Icon {...p} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
);

export const DatabaseIcon = (p: IconProps) => (
  <Icon {...p} d={<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>} />
);

export const ServerIcon = (p: IconProps) => (
  <Icon {...p} d={<><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></>} />
);

export const GlobeIcon = (p: IconProps) => (
  <Icon {...p} d={<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>} />
);

export const LockIcon = (p: IconProps) => (
  <Icon {...p} d={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>} />
);

export const TrendingUpIcon = (p: IconProps) => (
  <Icon {...p} d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" />
);

export const TargetIcon = (p: IconProps) => (
  <Icon {...p} d={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>} />
);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p} d="M5 12h14M12 5l7 7-7 7" />
);

export const MinusIcon = (p: IconProps) => (
  <Icon {...p} d="M5 12h14" />
);
