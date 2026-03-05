import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  BarChart3,
  Users,
  ShoppingCart,
  TrendingUp,
  Phone,
  FileText,
  Menu,
  X,
  ChevronDown,
  Home,
  Package,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  category: string;
}

interface NavCategory {
  name: string;
  items: NavItem[];
}

const navCategories: NavCategory[] = [
  {
    name: "Dashboard",
    items: [
      { label: "Home", href: "/", icon: <Home className="w-4 h-4" />, category: "dashboard" },
    ],
  },
  {
    name: "Vendas & Clientes",
    items: [
      { label: "Contas a Receber", href: "/relatorio", icon: <DollarSign className="w-4 h-4" />, category: "vendas" },
      { label: "Histórico de Pedidos", href: "/pedidos", icon: <ShoppingCart className="w-4 h-4" />, category: "vendas" },
      { label: "Clientes Inativos", href: "/clientes-inativos", icon: <Users className="w-4 h-4" />, category: "vendas" },
    ],
  },
  {
    name: "Prospecção",
    items: [
      { label: "Novos Leads", href: "/prospecção", icon: <Phone className="w-4 h-4" />, category: "prospecção" },
    ],
  },
  {
    name: "Relatórios",
    items: [
      { label: "Relatório Mensal", href: "/relatorio", icon: <FileText className="w-4 h-4" />, category: "relatorios" },
      { label: "Por Região/Estado", href: "/relatorio-regiao", icon: <BarChart3 className="w-4 h-4" />, category: "relatorios" },
      { label: "Importar CSV", href: "/upload", icon: <Package className="w-4 h-4" />, category: "relatorios" },
    ],
  },
];



export function SidebarNav() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Vendas & Clientes");

  const isActive = (href: string) => {
    return location === href || location.startsWith(href + "/");
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-64 bg-card border-r border-border transition-transform duration-300 z-40",
          "md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">Vendas Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">UNIX PACK</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navCategories.map((category) => (
            <div key={category.name} className="space-y-1">
              {/* Category Header */}
              <button
                onClick={() =>
                  setExpandedCategory(
                    expandedCategory === category.name ? null : category.name
                  )
                }
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                {category.name}
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    expandedCategory === category.name && "rotate-180"
                  )}
                />
              </button>

              {/* Category Items */}
              {expandedCategory === category.name && (
                <div className="space-y-1">
                  {category.items.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <span
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                          isActive(item.href)
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          <p>Dashboard v1.0</p>
          <p className="mt-1">© 2026 UNIX PACK</p>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
