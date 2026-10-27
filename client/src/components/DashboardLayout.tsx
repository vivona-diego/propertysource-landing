import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DATA_ROOM_LOGO, initials } from "@/lib/dataRoom";
import { cn } from "@/lib/utils";
import { Activity, Eye, FileText, LogOut, Menu, Settings, Users } from "lucide-react";
import type { ReactNode } from "react";

export type DataRoomAdminSection = "documents" | "investors" | "activity" | "settings";

type DashboardLayoutProps = {
  children: ReactNode;
  activeSection: DataRoomAdminSection;
  onSectionChange: (section: DataRoomAdminSection) => void;
  admin: { name: string; email: string };
  onLogout: () => void;
};

const navigation: Array<{ id: DataRoomAdminSection; label: string; icon: typeof FileText }> = [
  { id: "documents", label: "Documents", icon: FileText },
  { id: "investors", label: "Investors", icon: Users },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children, activeSection, onSectionChange, admin, onLogout }: DashboardLayoutProps) {
  return (
    <SidebarProvider className="data-room-admin-shell">
      <Sidebar collapsible="icon" className="data-room-admin-sidebar border-r-0">
        <SidebarHeader className="data-room-admin-sidebar-header">
          <a href="/data-room/admin" className="data-room-admin-logo" aria-label="Investor Data Room administration">
            <span className="data-room-admin-logo-image"><img src={DATA_ROOM_LOGO} alt="Property Hub Exchange" /></span>
            <span className="data-room-admin-logo-copy"><strong>Investor Room</strong><small>Administration</small></span>
          </a>
        </SidebarHeader>
        <SidebarContent className="px-2 pt-4">
          <p className="data-room-sidebar-label">Workspace</p>
          <SidebarMenu>
            {navigation.map(({ id, label, icon: Icon }) => (
              <SidebarMenuItem key={id}>
                <SidebarMenuButton
                  isActive={activeSection === id}
                  tooltip={label}
                  onClick={() => onSectionChange(id)}
                  className={cn("data-room-sidebar-button", activeSection === id && "data-room-sidebar-button-active")}
                >
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="data-room-admin-sidebar-footer">
          <a href="/data-room" target="_blank" rel="noreferrer" className="data-room-preview-link">
            <Eye size={15} /><span>Preview room</span>
          </a>
          <div className="data-room-admin-account">
            <Avatar className="size-9 border border-white/15 bg-[#285946] text-[#dff0bf]">
              <AvatarFallback className="bg-[#285946] text-xs font-bold text-[#dff0bf]">{initials(admin.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p>{admin.name || "Administrator"}</p>
              <span>{admin.email}</span>
            </div>
          </div>
          <button onClick={onLogout} className="data-room-signout"><LogOut size={15} /><span>Sign out</span></button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="data-room-admin-inset">
        <header className="data-room-admin-topbar">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="data-room-sidebar-trigger" />
            <div className="data-room-mobile-title"><Menu size={15} /><span>Investor room</span></div>
          </div>
          <a href="/data-room" target="_blank" rel="noreferrer" className="data-room-top-preview"><Eye size={14} /> Preview room</a>
        </header>
        <main className="data-room-admin-main">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
