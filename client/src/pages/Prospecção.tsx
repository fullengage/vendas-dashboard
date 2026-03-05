import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";

function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; color: string }> = {
    nao_contatado: { label: "Não Contatado", color: "bg-gray-100 text-gray-700" },
    contatado: { label: "Contatado", color: "bg-blue-100 text-blue-700" },
    interessado: { label: "Interessado", color: "bg-yellow-100 text-yellow-700" },
    proposta_enviada: { label: "Proposta Enviada", color: "bg-purple-100 text-purple-700" },
    fechado: { label: "Fechado", color: "bg-green-100 text-green-700" },
    rejeitado: { label: "Rejeitado", color: "bg-red-100 text-red-700" },
  };
  return statusMap[status] || { label: status, color: "bg-gray-100 text-gray-700" };
}

function openWhatsApp(telefone: string | null, celular: string | null, nomeEmpresa: string) {
  const numero = (celular || telefone || "").replace(/\D/g, "");
  if (!numero) {
    alert("Nenhum número de telefone disponível");
    return;
  }
  const mensagem = `Olá! Gostaria de conversar sobre nossas soluções para ${nomeEmpresa}.`;
  const url = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank");
}

export function Prospecção() {
  const [busca, setBusca] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterCidade, setFilterCidade] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(0);
  const itensPorPagina = 50;

  const filtrosInput = useMemo(
    () => ({
      statusContato: filterStatus === "todos" ? undefined : filterStatus,
      cidade: filterCidade || undefined,
      estado: filterEstado || undefined,
      busca: busca || undefined,
      limite: itensPorPagina,
      offset: paginaAtual * itensPorPagina,
    }),
    [filterStatus, filterCidade, filterEstado, busca, paginaAtual]
  );

  const { data: leads, isLoading: leadsLoading } = trpc.leads.listaComFiltros.useQuery(filtrosInput);
  const { data: contagem } = trpc.leads.contaComFiltros.useQuery({
    statusContato: filterStatus === "todos" ? undefined : filterStatus,
    cidade: filterCidade || undefined,
    estado: filterEstado || undefined,
    busca: busca || undefined,
  });

  const totalPaginas = Math.ceil((contagem?.total || 0) / itensPorPagina);

  const limparFiltros = () => {
    setBusca("");
    setFilterStatus("todos");
    setFilterCidade("");
    setFilterEstado("");
    setPaginaAtual(0);
  };

  const temFiltros = busca || filterStatus !== "todos" || filterCidade || filterEstado;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-primary" />
                Prospecção via WhatsApp
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie leads e contate clientes via WhatsApp
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
            {temFiltros && (
              <button
                onClick={limparFiltros}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Busca */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Buscar Lead
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, CNPJ, CPF..."
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setPaginaAtual(0);
                  }}
                  className="pl-9"
                />
              </div>
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
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="nao_contatado">Não Contatado</SelectItem>
                  <SelectItem value="contatado">Contatado</SelectItem>
                  <SelectItem value="interessado">Interessado</SelectItem>
                  <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cidade */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Cidade
              </label>
              <Input
                placeholder="Buscar cidade..."
                value={filterCidade}
                onChange={(e) => {
                  setFilterCidade(e.target.value);
                  setPaginaAtual(0);
                }}
              />
            </div>

            {/* Estado */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Estado
              </label>
              <Input
                placeholder="SP, MG, RJ..."
                value={filterEstado}
                onChange={(e) => {
                  setFilterEstado(e.target.value.toUpperCase());
                  setPaginaAtual(0);
                }}
                maxLength={2}
              />
            </div>
          </div>
        </motion.div>

        {/* Tabela de Leads */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          {leadsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : !leads || leads.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum lead encontrado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Empresa</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Contato</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Localização</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leads.map((lead: any) => {
                      const statusBadge = getStatusBadge(lead.statusContato);
                      return (
                        <tr key={lead.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 text-sm">
                            <div>
                              <p className="font-medium text-foreground">{lead.razaoSocial}</p>
                              {lead.nomeFantasia && (
                                <p className="text-xs text-muted-foreground">{lead.nomeFantasia}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="space-y-1">
                              {lead.celular && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  <span className="text-xs">{lead.celular}</span>
                                </div>
                              )}
                              {lead.email && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Mail className="w-3 h-3" />
                                  <span className="text-xs">{lead.email}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span className="text-xs">
                                {lead.cidade && lead.estado ? `${lead.cidade}, ${lead.estado}` : "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Button
                              size="sm"
                              onClick={() => openWhatsApp(lead.telefone, lead.celular, lead.razaoSocial)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              WhatsApp
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  Página {paginaAtual + 1} de {totalPaginas} ({contagem?.total || 0} leads)
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPaginaAtual(Math.max(0, paginaAtual - 1))}
                    disabled={paginaAtual === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPaginaAtual(Math.min(totalPaginas - 1, paginaAtual + 1))}
                    disabled={paginaAtual === totalPaginas - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
