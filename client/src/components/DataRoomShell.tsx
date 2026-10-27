import { DATA_ROOM_LOGO, useDataRoomMetadata } from "@/lib/dataRoom";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";

type DataRoomShellProps = {
  children: ReactNode;
  title?: string;
  compact?: boolean;
};

export function DataRoomBrand({ dark = false }: { dark?: boolean }) {
  return (
    <a href="/" className={`data-room-brand ${dark ? "data-room-brand-dark" : ""}`} aria-label="Property Hub Exchange home">
      <span className="data-room-brand-mark">
        <img src={DATA_ROOM_LOGO} alt="Property Hub Exchange" />
      </span>
      <span className="data-room-brand-copy">
        <strong>Investor Data Room</strong>
        <span><LockKeyhole size={11} aria-hidden="true" /> Private access</span>
      </span>
    </a>
  );
}

export default function DataRoomShell({ children, title = "Investor Data Room", compact = false }: DataRoomShellProps) {
  useDataRoomMetadata(`Property Hub Exchange | ${title}`);

  return (
    <div className={`data-room-shell ${compact ? "data-room-shell-compact" : ""}`}>
      <header className="data-room-public-header">
        <div className="data-room-public-header-inner">
          <DataRoomBrand />
          <a href="/" className="data-room-home-link"><ArrowLeft size={15} /> Public website</a>
        </div>
      </header>
      {children}
    </div>
  );
}
