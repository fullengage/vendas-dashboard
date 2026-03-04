import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatNumber } from "@/hooks/useData";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PedidoDetalhesModal } from "@/components/PedidoDetalhesModal";
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Filter,
  Eye,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function getStatusBadge(isFaturado: boolean, situacao: string) {
  if (isFaturado) {
    return { label: "Faturado", color: "bg-green-ok-light text-green-ok" };
  }
  if (situacao === "CANCELADO") {
    return { label: "Cancelado", color: "bg-red-100 text-red-700" };
  }
  return { label: "Não Faturado", color: "bg-orange-alert-light text-orange-alert" };
}

export function PedidosHistorico() {
  const [searchCodPedido, setSearchCodPedido] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [filterVendedor, setFilterVendedor] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any>(null);
  const [paginaAtual, setPaginaAtual] = useState(0);
  const itensPorPagina = 50;

  // Buscar pedidos com filtros
  const filtrosInput = useMemo(() => ({
    codPessoa: filterCliente || undefined,
    codUsuario: filterVendedor || undefined,
    dataInicio: filterDataInicio || undefined,
    dataFim: filterDataFim || undefined,
    isFaturado: filterStatus === "faturado" ? true : filterStatus === "nao-faturado" ? false : undefined,
    limite: itensPorPagina,
    offset: paginaAtual * itensPorPagina,
  }), [filterCliente, filterVendedor, filterDataInicio, filterDataFim, filterStatus, paginaAtual]);

  const { data: pedidosData, isLoading: pedidosLoading } = trpc.pedidos.listaComFiltros.useQuery(filtrosInput);

  // Buscar por número de pedido
  const { data: pedidosBuscados, isLoading: buscaLoading } = trpc.pedidos.buscaPorNumero.useQuery(
    { codPedido: searchCodPedido },
    { enabled: searchCodPedido.length > 0 }
  );

  const pedidosExibidos = searchCodPedido.length > 0 ? pedidosBuscados : pedidosData;
  const isLoading = searchCodPedido.length > 0 ? buscaLoading : pedidosLoading;

  const abrirDetalhes = (pedido: any) => {
    setPedidoSelecionado(pedido);
    setModalAberto(true);
  };

  const fecharDetalhes = () => {
    setModalAberto(false);
    setPedidoSelecionado(null);
  };

  const limparFiltros = () => {
    setSearchCodPedido("");
    setFilterCliente("");
    setFilterVendedor("");
    setFilterStatus("");
    setFilterDataInicio("");
    setFilterDataFim("");
    setPaginaAtual(0);
  };

  const temFiltrosAtivos = filterCliente || filterVendedor || filterStatus || filterDataInicio || filterDataFim || searchCodPedido;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </a>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-primary" />
                Histórico de Pedidos
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Visualize todos os pedidos com filtros e busca avançada
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-border rounded-lg p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros e Busca
            </h3>
            {temFiltrosAtivos && (
              <button
                onClick={limparFiltros}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Busca por número */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Buscar Pedido
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nº do pedido..."
                  value={searchCodPedido}
                  onChange={(e) => {
                    setSearchCodPedido(e.target.value);
                    setPaginaAtual(0);
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Cliente */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Cliente
              </label>
              <Input
                placeholder="Código ou nome..."
                value={filterCliente}
                onChange={(e) => {
                  setFilterCliente(e.target.value);
                  setPaginaAtual(0);
                }}
              />
            </div>

            {/* Vendedor */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Vendedor
              </label>
              <Input
                placeholder="Código do vendedor..."
                value={filterVendedor}
                onChange={(e) => {
                  setFilterVendedor(e.target.value);
                  setPaginaAtual(0);
                }}
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Status
              </label>
              <Select value={filterStatus} onValueChange={(value) => {
                setFilterStatus(value);
                setPaginaAtual(0);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="faturado">Faturado</SelectItem>
                  <SelectItem value="nao-faturado">Não Faturado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data Início */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Data Início
              </label>
              <Input
                type="date"
                value={filterDataInicio}
                onChange={(e) => {
                  setFilterDataInicio(e.target.value);
                  setPaginaAtual(0);
                }}
              />
            </div>

            {/* Data Fim */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Data Fim
              </label>
              <Input
                type="date"
                value={filterDataFim}
                onChange={(e) => {
                  setFilterDataFim(e.target.value);
                  setPaginaAtual(0);
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Tabela de Pedidos */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              {searchCodPedido.length > 0 ? "Resultados da Busca" : "Todos os Pedidos"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading ? "Carregando..." : `${pedidosExibidos?.length || 0} pedidos encontrados`}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : pedidosExibidos && pedidosExibidos.length > 0 ? (
            <ScrollArea className="max-h-[700px] border-t border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                    <tr>
                      <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">
                        Pedido
                      </th>
                      <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">
                        Data
                      </th>
                      <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">
                        Vendedor
                      </th>
                      <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosExibidos.map((p: any, i: number) => {
                      const statusInfo = getStatusBadge(p.isFaturado, p.situacao);
                      return (
                        <tr key={p.id || i} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-foreground">{p.codPedido}</td>
                          <td className="py-2 px-3 text-foreground">{p.codPessoa || "—"}</td>
                          <td className="py-2 px-3 text-muted-foreground">{formatDate(p.dtaEmissao)}</td>
                          <td className="py-2 px-3">
                            <Badge className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {formatCurrency(parseFloat(p.valorFinal || p.valorTotal || "0"))}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">{p.codUsuario || "—"}</td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => abrirDetalhes(p)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10 rounded transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">Nenhum pedido encontrado com os filtros selecionados</p>
            </div>
          )}
        </motion.div>

        {/* Paginação */}
        {!searchCodPedido && pedidosExibidos && pedidosExibidos.length > 0 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-muted-foreground">
              Página {paginaAtual + 1} · {itensPorPagina} itens por página
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual(Math.max(0, paginaAtual - 1))}
                disabled={paginaAtual === 0}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual(paginaAtual + 1)}
                disabled={pedidosExibidos.length < itensPorPagina}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}

        {/* Modal de Detalhes */}
        {pedidoSelecionado && (
          <PedidoDetalhesModal
            isOpen={modalAberto}
            onClose={fecharDetalhes}
            orderId={pedidoSelecionado.id}
            codPedido={pedidoSelecionado.codPedido}
            dtaEmissao={pedidoSelecionado.dtaEmissao}
            valorTotal={pedidoSelecionado.valorFinal || pedidoSelecionado.valorTotal}
            isFaturado={pedidoSelecionado.isFaturado}
            situacao={pedidoSelecionado.situacao}
          />
        )}
      </main>
    </div>
  );
}
