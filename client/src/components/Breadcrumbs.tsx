import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";

interface Breadcrumb {
  label: string;
  href: string;
}

const routeLabels: Record<string, string> = {
  "/": "Home",
  "/relatorio": "Contas a Receber",
  "/upload": "Importar CSV",
  "/relatorio-regiao": "Por Região/Estado",
  "/vendedor": "Detalhes do Vendedor",
  "/cliente": "Histórico do Cliente",
  "/clientes-inativos": "Clientes Inativos",
  "/pedidos": "Histórico de Pedidos",
  "/prospecção": "Novos Leads",
};

export function Breadcrumbs() {
  const [location] = useLocation();

  // Generate breadcrumbs from current location
  const generateBreadcrumbs = (): Breadcrumb[] => {
    const breadcrumbs: Breadcrumb[] = [{ label: "Home", href: "/" }];

    if (location === "/") return breadcrumbs;

    // Check for exact route match
    if (routeLabels[location]) {
      breadcrumbs.push({ label: routeLabels[location], href: location });
      return breadcrumbs;
    }

    // Check for parameterized routes
    const pathParts = location.split("/").filter(Boolean);

    if (pathParts[0] === "vendedor") {
      breadcrumbs.push({ label: "Vendedores", href: "/relatorio" });
      breadcrumbs.push({
        label: `${decodeURIComponent(pathParts[1])}`,
        href: location,
      });
    } else if (pathParts[0] === "cliente") {
      breadcrumbs.push({ label: "Clientes", href: "/relatorio" });
      breadcrumbs.push({
        label: `${decodeURIComponent(pathParts[1])}`,
        href: location,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-2 px-6 py-3 bg-card border-b border-border text-sm">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-2">
          {index === 0 ? (
            <Link href={crumb.href}>
              <a className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                <Home className="w-4 h-4" />
              </a>
            </Link>
          ) : (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              {index === breadcrumbs.length - 1 ? (
                <span className="text-foreground font-medium">{crumb.label}</span>
              ) : (
                <Link href={crumb.href}>
                  <a className="text-muted-foreground hover:text-foreground transition-colors">
                    {crumb.label}
                  </a>
                </Link>
              )}
            </>
          )}
        </div>
      ))}
    </nav>
  );
}
