import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Relatorio from "./pages/Relatorio";
import UploadCsv from "./pages/UploadCsv";
import RelatorioRegiao from "./pages/RelatorioRegiao";
import DetalheVendedor from "./pages/DetalheVendedor";
import HistoricoCliente from "./pages/HistoricoCliente";
import ClientesInativos from "./pages/ClientesInativos";
import { PedidosHistorico } from "./pages/PedidosHistorico";
import { Prospecção } from "./pages/Prospecção";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/relatorio"} component={Relatorio} />
      <Route path={"/upload"} component={UploadCsv} />
      <Route path={"relatorio-regiao"} component={RelatorioRegiao} />
      <Route path={"/vendedor/:nome"} component={DetalheVendedor} />
      <Route path={"/cliente/:nome"} component={HistoricoCliente} />
      <Route path="/clientes-inativos" component={ClientesInativos} />
      <Route path="/pedidos" component={PedidosHistorico} />
      <Route path="/prospecção" component={Prospecção} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider delayDuration={200}>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
