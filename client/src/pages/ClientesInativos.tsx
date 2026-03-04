import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatNumber } from "@/hooks/useData";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  AlertTriangle,
  Users,
  Calendar,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";

interface ClienteInativo {
  cliente: string;
  vendedor: string;
  cidade: string;
  ultimaCompra: string;
  totalValor: string;
  totalPago: string;
  qtdTitulos: number;
  diasSemComprar: number;
}

type SortField = "cliente" | "vendedor" | "cidade" | "ultimaCompra" | "totalValor" | "diasSemComprar";

function diasParaMeses(dias: number): string {
  const meses = Math.floor(dias / 30);
  const diasRestantes = dias % 30;
  
  if (meses === 0) return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  if (diasRestantes === 0) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  return `${meses} ${meses === 1 ? 'mês' : 'meses'} e ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`;
}

function SortHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
  align = "left",
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: "asc" | "desc";
  onSort: (field: SortField) => void;
  align?: "left" | "right" | "center";
}) {
  const isActive = sortField === field;
  return (
    <th
      className={`py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      }`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : ""}`}>
        <span>{label}</span>
        <ArrowUpDown className={`w-3 h-3 ${isActive ? "text-primary" : "text-muted-foreground/50"}`} />
        {isActive && (
          <span className="text-[10px] text-primary">{sortDir === "desc" ? "↓" : "↑"}</span>
        )}
      </div>
    </th>
  );
}

export default function ClientesInativos() {
  const [mesesInatividade, setMesesInatividade] = useState(6);
  const [sortField, setSortField] = useState<SortField>("diasSemComprar");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { data: clientes, isLoading } = trpc.contas.clientesInativos.useQuery({
    mesesInatividade,
  });

  const sortedClientes = useMemo(() => {
    if (!clientes) return [];
    const sorted = [...clientes];
    sorted.sort((a: ClienteInativo, b: ClienteInativo) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "desc" ? bVal - aVal : aVal - bVal;
      }
      return sortDir === "desc"
        ? String(bVal).localeCompare(String(aVal))
        : String(aVal).localeCompare(String(bVal));
    });
    return sorted;
  }, [clientes, sortField, sortDir]);

  // Pagination
  const totalPages = Math.ceil(sortedClientes.length / itemsPerPage);
  const paginatedClientes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedClientes.slice(startIndex, endIndex);
  }, [sortedClientes, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [mesesInatividade, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Estatísticas
  const stats = useMemo(() => {
    if (!clientes) return { total: 0, totalValor: 0, mediaDias: 0 };
    return {
      total: clientes.length,
      totalValor: clientes.reduce((sum: number, c: ClienteInativo) => sum + parseFloat(c.totalValor), 0),
      mediaDias: clientes.length > 0
        ? Math.round(clientes.reduce((sum: number, c: ClienteInativo) => sum + c.diasSemComprar, 0) / clientes.length)
        : 0,
    };
  }, [clientes]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground font-medium tracking-wide uppercase">
            Carregando clientes inativos...
          </span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="h-8">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-alert" />
                  Clientes Inativos
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">
                  Clientes sem comprar há {mesesInatividade}+ meses
                </p>
              </div>
            </div>

            {/* Filtro */}
            <div className="flex items-center gap-2">
              <Select
                value={mesesInatividade.toString()}
                onValueChange={(v) => setMesesInatividade(parseInt(v))}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3+ meses sem comprar</SelectItem>
                  <SelectItem value="6">6+ meses sem comprar</SelectItem>
                  <SelectItem value="9">9+ meses sem comprar</SelectItem>
                  <SelectItem value="12">12+ meses sem comprar</SelectItem>
                  <SelectItem value="18">18+ meses sem comprar</SelectItem>
                  <SelectItem value="24">24+ meses sem comprar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="container py-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-orange-alert" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Total de Clientes Inativos
                </p>
              </div>
              <p className="text-2xl font-bold text-foreground font-mono">{formatNumber(stats.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sem comprar há {mesesInatividade}+ meses
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-orange-alert" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Valor Total Histórico
                </p>
              </div>
              <p className="text-2xl font-bold text-foreground font-mono">
                {formatCurrency(stats.totalValor)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Faturamento total desses clientes
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-orange-alert" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Média de Inatividade
                </p>
              </div>
              <p className="text-2xl font-bold text-foreground font-mono">
                {diasParaMeses(stats.mediaDias)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tempo médio sem comprar
              </p>
            </motion.div>
          </div>

          {/* Tabela */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card border border-border rounded-lg overflow-hidden"
          >
            <div className="p-5 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Lista de Clientes Inativos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sortedClientes.length} clientes · Página {currentPage} de {totalPages} · Mostrando {paginatedClientes.length} de {sortedClientes.length}
              </p>
            </div>
            <div className="border-t border-border overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                  <tr>
                    <th className="text-left py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                    <SortHeader field="cliente" label="Cliente" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader field="vendedor" label="Vendedor" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader field="cidade" label="Cidade" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader field="ultimaCompra" label="Última Compra" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="diasSemComprar" label="Tempo Inativo" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="totalValor" label="Total Histórico" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <th className="text-right py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClientes.map((c: ClienteInativo, idx: number) => {
                    const i = (currentPage - 1) * itemsPerPage + idx;
                    const mesesInativo = Math.floor(c.diasSemComprar / 30);
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-2.5 px-4 font-medium text-foreground">
                          <Link href={`/cliente/${encodeURIComponent(c.cliente)}?vendedor=${encodeURIComponent(c.vendedor)}`}>
                            <span className="text-primary hover:underline cursor-pointer">
                              {c.cliente.length > 35 ? c.cliente.substring(0, 35) + "…" : c.cliente}
                            </span>
                          </Link>
                        </td>
                        <td className="py-2.5 px-4">
                          <Link href={`/vendedor/${encodeURIComponent(c.vendedor)}`}>
                            <span className="text-primary hover:underline cursor-pointer text-xs">
                              {c.vendedor.length > 25 ? c.vendedor.substring(0, 25) + "…" : c.vendedor}
                            </span>
                          </Link>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">{c.cidade || "N/D"}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-foreground">{c.ultimaCompra}</td>
                        <td className="py-2.5 px-4 text-right">
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-medium ${
                              mesesInativo >= 12
                                ? "bg-red-500/10 text-red-500"
                                : mesesInativo >= 9
                                ? "bg-orange-alert-light text-orange-alert"
                                : "bg-yellow-500/10 text-yellow-600"
                            }`}
                          >
                            {diasParaMeses(c.diasSemComprar)}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(parseFloat(c.totalValor))}</td>
                        <td className="py-2.5 px-4 text-right">
                          <Link href={`/cliente/${encodeURIComponent(c.cliente)}?vendedor=${encodeURIComponent(c.vendedor)}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              Ver Histórico
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, sortedClientes.length)} de {sortedClientes.length} clientes
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="h-8 text-xs"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <div className="text-xs text-muted-foreground font-medium">
                    Página {currentPage} de {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="h-8 text-xs"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
          UNIX PACK Embalagens Flexíveis — Clientes Inativos
        </p>
      </footer>
    </div>
  );
}
