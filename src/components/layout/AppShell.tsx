import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Database, LayoutDashboard, BookOpen, Wrench, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/knowledge-bank', label: 'Knowledge Bank', icon: BookOpen },
  { to: '/spare-parts', label: 'Spare Parts', icon: Wrench },
];

interface AppShellProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ title, subtitle, actions, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out', description: 'You have been signed out.' });
    navigate('/auth');
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border/60">
        <SidebarHeader className="border-b border-border/60">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-md shadow-primary/20">
              <Database className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div className="leading-tight overflow-hidden group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-semibold tracking-tight">Data Recorder</p>
              <p className="text-xs text-muted-foreground truncate">Knowledge platform</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link to={item.to}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-border/60">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton tooltip={user?.email ?? 'Account'} className="gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span className="truncate">{user?.email}</span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="w-56">
              <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-card/80 backdrop-blur-lg supports-[backdrop-filter]:bg-card/60 px-4 sm:px-6">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-between gap-3">
            <div className="leading-tight min-w-0">
              {title && <h1 className="text-base font-semibold tracking-tight truncate">{title}</h1>}
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1 bg-gradient-to-b from-background to-muted/30">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppShell;
