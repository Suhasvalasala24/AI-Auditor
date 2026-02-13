import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  GitBranch,
  Scale,
  Brain,
  Lock,
  Shield,
  Cpu,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const dashboardSubItems = [
  { name: "Drift", href: "/drift", icon: GitBranch },
  { name: "Bias", href: "/bias", icon: Scale },
  { name: "Hallucination", href: "/hallucination", icon: Brain },
  { name: "PII", href: "/pii", icon: Lock },
  { name: "Compliance", href: "/compliance", icon: Shield },
];

const mainNavItems = [
  { name: "Model Manager", href: "/model-manager", icon: Cpu },
  { name: "Audits", href: "/audits", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);

  const isDashboardActive =
    location === "/" ||
    dashboardSubItems.some((item) => location === item.href);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex flex-col">
          <span
            className="font-bold text-lg text-foreground"
            data-testid="text-app-title"
          >
            AI Auditor
          </span>
          <span className="text-xs text-muted-foreground">Enterprise Suite</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible
                open={isDashboardOpen}
                onOpenChange={setIsDashboardOpen}
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={
                        isDashboardActive ? "bg-sidebar-accent" : undefined
                      }
                      data-testid="button-nav-dashboard"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="flex-1">Dashboard</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isDashboardOpen ? "rotate-180" : ""
                        }`}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {dashboardSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.name}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === item.href}
                          >
                            <Link
                              href={item.href}
                              data-testid={`link-nav-${item.name.toLowerCase()}`}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.name}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.href}
                  >
                    <Link
                      href={item.href}
                      data-testid={`link-nav-${item.name.toLowerCase().replace(" ", "-")}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
