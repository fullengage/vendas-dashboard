import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAnos, useVendedores, formatCurrency, formatNumber, formatPercent } from "@/hooks/useData";
import { getUfFromCidade, getRegiaoFromUf, getEstadoNome } from "@shared/cidadeEstado";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Treemap,
} from "recharts";
import {
  ArrowLeft,
  MapPin,
  Globe,
  Building2,
  ArrowUpDown,
  TrendingUp,
  Users,
} from "lucide-react";

const REGIAO_COLORS: Record<string, string> = {
  "Sudeste": "#0F4C75",
  "Sul": "#2D6A4F",
  "Centro-Oeste": "#E85D04",
  "Nordeste": "#6B4C9A",
  "Norte": "#C45D3E",
  "N/D": "#999999",
};

const CHART_COLORS = [
  "#0F4C75", "#2D6A4F", "#E85D04", "#6B4C9A", "#C45D3E",
  "#1B7A8C", "#8B6914", "#4A7C59", "#9B4DCA", "#D4763D",
  "#2E86AB", "#A23B72", "#F18F01", "#3C6E71", "#D64045",
];

interface CidadeData {
  cidade: string | null;
  totalValor: string;
  totalPago: string;
  totalDesconto: string;
  qtdTitulos: number;
  qtdClientes: number;
  qtdVendedores: number;
  mediaAtraso: string;
  titulosAtrasados: number;
}

interface EstadoAgg {
  uf: string;
  nomeEstado: string;
  regiao: string;
  totalValor: number;
  totalPago: number;
  qtdTitulos: number;
  qtdClientes: number;
  qtdCidades: number;
  mediaAtraso: number;
  titulosAtrasados: number;
  taxaRecebimento: number;
}

interface RegiaoAgg {
  regiao: string;
  totalValor: number;
  totalPago: number;
  qtdTitulos: number;
  qtdClientes: number;
  qtdEstados: number;
  qtdCidades: number;
  mediaAtraso: number;
  titulosAtrasados: number;
  taxaRecebimento: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card border border-border rounded-md shadow-lg p-3 text-xs">
      <p className="font-medium text-foreground mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono text-foreground">
            {typeof entry.value === "number" ? formatCurrency(entry.value) : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-card border border-border rounded-md shadow-lg p-3 text-xs">
      <p className="font-medium text-foreground mb-1">{entry.name}</p>
      <p className="text-muted-foreground">
        Valor: <span className="font-mono text-foreground">{formatCurrency(entry.value)}</span>
      </p>
      <p className="text-muted-foreground">
        Participação: <span className="font-mono text-foreground">{formatPercent(entry.payload.percent)}</span>
      </p>
    </div>
  );
}

type SortField = "uf" | "nomeEstado" | "regiao" | "totalValor" | "totalPago" | "qtdTitulos" | "qtdClientes" | "qtdCidades" | "mediaAtraso" | "titulosAtrasados" | "taxaRecebimento";

export default function RelatorioRegiao() {
  const [anoFilter, setAnoFilter] = useState("todos");
  const [vendedorFilter, setVendedorFilter] = useState("todos");
  const [regiaoFilter, setRegiaoFilter] = useState("todos");
  const [mesFilter, setMesFilter] = useState("todos");
  const [sortField, setSortField] = useState<SortField>("totalValor");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const anosQuery = useAnos();
  const vendedoresQuery = useVendedores();

  const input = useMemo(() => ({
    vendedor: vendedorFilter !== "todos" ? vendedorFilter : undefined,
    ano: anoFilter !== "todos" ? anoFilter : undefined,
    mes: mesFilter !== "todos" ? mesFilter : undefined,
  }), [vendedorFilter, anoFilter, mesFilter]);

  const { data: cidadeData, isLoading } = trpc.contas.relatorioPorCidade.useQuery(input);

  // Aggregate by estado
  const estadoStats = useMemo(() => {
    if (!cidadeData) return [];
    const map = new Map<string, EstadoAgg>();

    for (const c of cidadeData) {
      const cidade = c.cidade || "";
      const uf = getUfFromCidade(cidade);
      const regiao = getRegiaoFromUf(uf);
      const nomeEstado = getEstadoNome(uf);

      const existing = map.get(uf) || {
        uf,
        nomeEstado,
        regiao,
        totalValor: 0,
        totalPago: 0,
        qtdTitulos: 0,
        qtdClientes: 0,
        qtdCidades: 0,
        mediaAtraso: 0,
        titulosAtrasados: 0,
        taxaRecebimento: 0,
      };

      existing.totalValor += parseFloat(c.totalValor) || 0;
      existing.totalPago += parseFloat(c.totalPago) || 0;
      existing.qtdTitulos += c.qtdTitulos;
      existing.qtdClientes += c.qtdClientes;
      existing.qtdCidades += 1;
      existing.titulosAtrasados += c.titulosAtrasados;

      map.set(uf, existing);
    }

    // Calculate averages and rates
    const stats = Array.from(map.values()).map((s) => ({
      ...s,
      mediaAtraso: 0,
      taxaRecebimento: s.totalValor > 0 ? (s.totalPago / s.totalValor) * 100 : 0,
    }));

    // Calculate weighted average atraso
    for (const s of stats) {
      const cidadesDoEstado = cidadeData.filter(
        (c) => getUfFromCidade(c.cidade || "") === s.uf
      );
      const totalTitulos = cidadesDoEstado.reduce((sum, c) => sum + c.qtdTitulos, 0);
      if (totalTitulos > 0) {
        s.mediaAtraso = Math.round(
          cidadesDoEstado.reduce(
            (sum, c) => sum + (parseFloat(c.mediaAtraso) || 0) * c.qtdTitulos,
            0
          ) / totalTitulos * 10
        ) / 10;
      }
    }

    return stats.sort((a, b) => b.totalValor - a.totalValor);
  }, [cidadeData]);

  // Aggregate by região
  const regiaoStats = useMemo(() => {
    const map = new Map<string, RegiaoAgg>();

    for (const e of estadoStats) {
      const existing = map.get(e.regiao) || {
        regiao: e.regiao,
        totalValor: 0,
        totalPago: 0,
        qtdTitulos: 0,
        qtdClientes: 0,
        qtdEstados: 0,
        qtdCidades: 0,
        mediaAtraso: 0,
        titulosAtrasados: 0,
        taxaRecebimento: 0,
      };

      existing.totalValor += e.totalValor;
      existing.totalPago += e.totalPago;
      existing.qtdTitulos += e.qtdTitulos;
      existing.qtdClientes += e.qtdClientes;
      existing.qtdEstados += 1;
      existing.qtdCidades += e.qtdCidades;
      existing.titulosAtrasados += e.titulosAtrasados;

      map.set(e.regiao, existing);
    }

    const stats = Array.from(map.values()).map((s) => ({
      ...s,
      taxaRecebimento: s.totalValor > 0 ? (s.totalPago / s.totalValor) * 100 : 0,
    }));

    // Weighted average atraso
    for (const s of stats) {
      const estadosDaRegiao = estadoStats.filter((e) => e.regiao === s.regiao);
      const totalTitulos = estadosDaRegiao.reduce((sum, e) => sum + e.qtdTitulos, 0);
      if (totalTitulos > 0) {
        s.mediaAtraso = Math.round(
          estadosDaRegiao.reduce(
            (sum, e) => sum + e.mediaAtraso * e.qtdTitulos,
            0
          ) / totalTitulos * 10
        ) / 10;
      }
    }

    return stats.sort((a, b) => b.totalValor - a.totalValor);
  }, [estadoStats]);

  // Filtered estado stats by region
  const filteredEstados = useMemo(() => {
    if (regiaoFilter === "todos") return estadoStats;
    return estadoStats.filter((e) => e.regiao === regiaoFilter);
  }, [estadoStats, regiaoFilter]);

  // Sorted estados
  const sortedEstados = useMemo(() => {
    const sorted = [...filteredEstados];
    sorted.sort((a, b) => {
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
  }, [filteredEstados, sortField, sortDir]);

  // Pie data for regions
  const pieData = useMemo(() => {
    const total = regiaoStats.reduce((s, r) => s + r.totalValor, 0);
    return regiaoStats.map((r) => ({
      name: r.regiao,
      value: Math.round(r.totalValor * 100) / 100,
      percent: total > 0 ? (r.totalValor / total) * 100 : 0,
    }));
  }, [regiaoStats]);

  // Top cidades data
  const topCidades = useMemo(() => {
    if (!cidadeData) return [];
    let filtered = cidadeData;
    if (regiaoFilter !== "todos") {
      filtered = cidadeData.filter(
        (c) => getRegiaoFromUf(getUfFromCidade(c.cidade || "")) === regiaoFilter
      );
    }
    return filtered.slice(0, 15).map((c) => ({
      name: c.cidade || "N/D",
      uf: getUfFromCidade(c.cidade || ""),
      valor: parseFloat(c.totalValor) || 0,
      pago: parseFloat(c.totalPago) || 0,
      titulos: c.qtdTitulos,
    }));
  }, [cidadeData, regiaoFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Totals
  const totals = useMemo(() => {
    const data = regiaoFilter === "todos" ? estadoStats : filteredEstados;
    return {
      totalValor: data.reduce((s, e) => s + e.totalValor, 0),
      totalPago: data.reduce((s, e) => s + e.totalPago, 0),
      qtdTitulos: data.reduce((s, e) => s + e.qtdTitulos, 0),
      qtdEstados: data.length,
      qtdCidades: data.reduce((s, e) => s + e.qtdCidades, 0),
    };
  }, [estadoStats, filteredEstados, regiaoFilter]);

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
            Carregando relatório...
          </span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Relatório por Região e Estado
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">
                  Distribuição geográfica das vendas
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={anoFilter} onValueChange={setAnoFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs bg-background">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os anos</SelectItem>
                  {(anosQuery.data || []).map((a: string) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                <SelectTrigger className="w-[200px] h-8 text-xs bg-background">
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os vendedores</SelectItem>
                  {(vendedoresQuery.data || []).map((v: string) => (
                    <SelectItem key={v} value={v}>
                      {v.length > 28 ? v.substring(0, 28) + "…" : v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={mesFilter} onValueChange={setMesFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs bg-background">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  <SelectItem value="01">Janeiro</SelectItem>
                  <SelectItem value="02">Fevereiro</SelectItem>
                  <SelectItem value="03">Março</SelectItem>
                  <SelectItem value="04">Abril</SelectItem>
                  <SelectItem value="05">Maio</SelectItem>
                  <SelectItem value="06">Junho</SelectItem>
                  <SelectItem value="07">Julho</SelectItem>
                  <SelectItem value="08">Agosto</SelectItem>
                  <SelectItem value="09">Setembro</SelectItem>
                  <SelectItem value="10">Outubro</SelectItem>
                  <SelectItem value="11">Novembro</SelectItem>
                  <SelectItem value="12">Dezembro</SelectItem>
                </SelectContent>
              </Select>

              <Select value={regiaoFilter} onValueChange={setRegiaoFilter}>
                <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                  <SelectValue placeholder="Região" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as regiões</SelectItem>
                  {regiaoStats.map((r) => (
                    <SelectItem key={r.regiao} value={r.regiao}>{r.regiao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(anoFilter !== "todos" || vendedorFilter !== "todos" || regiaoFilter !== "todos" || mesFilter !== "todos") && (
                <button
                  onClick={() => {
                    setAnoFilter("todos");
                    setVendedorFilter("todos");
                    setRegiaoFilter("todos");
                    setMesFilter("todos");
                  }}
                  className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* KPI Cards for Regions */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {regiaoStats.map((r, i) => (
            <motion.div
              key={r.regiao}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`bg-card border border-border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                regiaoFilter === r.regiao ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setRegiaoFilter(regiaoFilter === r.regiao ? "todos" : r.regiao)}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: REGIAO_COLORS[r.regiao] + "20",
                    color: REGIAO_COLORS[r.regiao],
                  }}
                >
                  {r.regiao}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {r.qtdEstados} UF{r.qtdEstados !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-lg font-bold font-mono text-foreground">
                {formatCurrency(r.totalValor)}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">
                  {formatNumber(r.qtdTitulos)} títulos
                </span>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    r.taxaRecebimento >= 98
                      ? "bg-green-ok-light text-green-ok"
                      : r.taxaRecebimento >= 90
                      ? "bg-petrol-bg text-petrol"
                      : "bg-orange-alert-light text-orange-alert"
                  }`}
                >
                  {formatPercent(r.taxaRecebimento)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <Tabs defaultValue="visaoGeral" className="space-y-4">
          <TabsList className="bg-card border border-border h-9">
            <TabsTrigger value="visaoGeral" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="estados" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MapPin className="w-3.5 h-3.5 mr-1.5" />
              Por Estado
            </TabsTrigger>
            <TabsTrigger value="cidades" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              Top Cidades
            </TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="visaoGeral">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="lg:col-span-2 bg-card border border-border rounded-lg p-5"
              >
                <h3 className="text-sm font-semibold text-foreground mb-1">Faturamento por Região</h3>
                <p className="text-xs text-muted-foreground mb-4">Comparativo de faturamento e recebimento</p>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={regiaoStats} margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="regiao"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="totalValor" name="Faturado" radius={[4, 4, 0, 0]} barSize={32}>
                      {regiaoStats.map((entry) => (
                        <Cell key={entry.regiao} fill={REGIAO_COLORS[entry.regiao] || "#999"} />
                      ))}
                    </Bar>
                    <Bar dataKey="totalPago" name="Recebido" radius={[4, 4, 0, 0]} barSize={32} fill="#2D6A4F" opacity={0.6} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-card border border-border rounded-lg p-5"
              >
                <h3 className="text-sm font-semibold text-foreground mb-1">Participação por Região</h3>
                <p className="text-xs text-muted-foreground mb-4">Distribuição percentual do faturamento</p>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={REGIAO_COLORS[entry.name] || "#999"} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </TabsContent>

          {/* Por Estado */}
          <TabsContent value="estados">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-card border border-border rounded-lg p-5"
            >
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Faturamento por Estado
                {regiaoFilter !== "todos" && (
                  <span className="text-primary ml-2 font-normal">— {regiaoFilter}</span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Top estados por valor faturado</p>
              <ResponsiveContainer width="100%" height={Math.max(300, filteredEstados.length * 38)}>
                <BarChart data={filteredEstados.slice(0, 20)} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="uf"
                    width={40}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="totalValor" name="Faturado" radius={[0, 4, 4, 0]} barSize={20}>
                    {filteredEstados.slice(0, 20).map((entry) => (
                      <Cell key={entry.uf} fill={REGIAO_COLORS[entry.regiao] || "#999"} />
                    ))}
                  </Bar>
                  <Bar dataKey="totalPago" name="Recebido" fill="#2D6A4F" radius={[0, 4, 4, 0]} barSize={20} opacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </TabsContent>

          {/* Top Cidades */}
          <TabsContent value="cidades">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-card border border-border rounded-lg p-5"
            >
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Top 15 Cidades
                {regiaoFilter !== "todos" && (
                  <span className="text-primary ml-2 font-normal">— {regiaoFilter}</span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Maiores cidades por valor faturado</p>
              <ResponsiveContainer width="100%" height={Math.max(350, topCidades.length * 30)}>
                <BarChart data={topCidades} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={200}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string) => {
                      const uf = getUfFromCidade(v);
                      const label = v.length > 22 ? v.substring(0, 22) + "…" : v;
                      return `${label} (${uf})`;
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valor" name="Faturado" radius={[0, 4, 4, 0]} barSize={20}>
                    {topCidades.map((entry, i) => (
                      <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Estado Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Detalhamento por Estado</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sortedEstados.length} estados · {formatNumber(totals.qtdCidades)} cidades · Clique no cabeçalho para ordenar
                </p>
              </div>
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <ScrollArea className="max-h-[500px]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                    <SortHeader field="uf" label="UF" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader field="nomeEstado" label="Estado" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader field="regiao" label="Região" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader field="totalValor" label="Faturado" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="totalPago" label="Recebido" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="taxaRecebimento" label="Taxa" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="qtdTitulos" label="Títulos" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="qtdClientes" label="Clientes" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="qtdCidades" label="Cidades" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="mediaAtraso" label="Atraso" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {sortedEstados.map((e, i) => (
                    <tr key={e.uf} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 text-muted-foreground">{i + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-foreground">{e.uf}</td>
                      <td className="py-2.5 px-4 text-foreground">{e.nomeEstado}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: REGIAO_COLORS[e.regiao] + "20",
                            color: REGIAO_COLORS[e.regiao],
                          }}
                        >
                          {e.regiao}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(e.totalValor)}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(e.totalPago)}</td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`font-mono px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            e.taxaRecebimento >= 98
                              ? "bg-green-ok-light text-green-ok"
                              : e.taxaRecebimento >= 90
                              ? "bg-petrol-bg text-petrol"
                              : "bg-orange-alert-light text-orange-alert"
                          }`}
                        >
                          {formatPercent(e.taxaRecebimento)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatNumber(e.qtdTitulos)}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatNumber(e.qtdClientes)}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{e.qtdCidades}</td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`font-mono px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            e.mediaAtraso <= 0
                              ? "bg-green-ok-light text-green-ok"
                              : e.mediaAtraso <= 10
                              ? "bg-petrol-bg text-petrol"
                              : "bg-orange-alert-light text-orange-alert"
                          }`}
                        >
                          {e.mediaAtraso}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </motion.div>

        {/* Footer */}
        <footer className="text-center py-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            UNIX PACK Embalagens Flexíveis — Relatório Geográfico
          </p>
        </footer>
      </main>
    </div>
  );
}

// Sort header component
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
  align?: "left" | "right";
}) {
  const isActive = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none ${
        align === "right" ? "text-right" : "text-left"
      } ${isActive ? "text-foreground" : ""}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <ArrowUpDown className="w-3 h-3" style={{ transform: sortDir === "asc" ? "scaleY(-1)" : undefined }} />
        )}
      </span>
    </th>
  );
}
