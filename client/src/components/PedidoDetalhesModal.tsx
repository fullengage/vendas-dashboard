import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/hooks/useData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, X } from "lucide-react";

interface PedidoDetalhesModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  codPedido: string;
  dtaEmissao: string;
  valorTotal: string;
  isFaturado: boolean;
  situacao: string;
}

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

export function PedidoDetalhesModal({
  isOpen,
  onClose,
  orderId,
  codPedido,
  dtaEmissao,
  valorTotal,
  isFaturado,
  situacao,
}: PedidoDetalhesModalProps) {
  const { data: itens, isLoading } = trpc.pedidos.getItensPedido.useQuery(
    { orderId },
    { enabled: isOpen }
  );

  const statusInfo = getStatusBadge(isFaturado, situacao);
  const totalItens = itens?.length || 0;
  const valorTotalNum = parseFloat(valorTotal || "0");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Detalhes do Pedido
              </DialogTitle>
              <DialogDescription>
                Pedido {codPedido} • {formatDate(dtaEmissao)}
              </DialogDescription>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 px-6 py-3 bg-muted/30 rounded-lg">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
            <Badge className={statusInfo.color} variant="outline">
              {statusInfo.label}
            </Badge>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Valor Total</p>
            <p className="text-sm font-bold text-foreground mt-1">{formatCurrency(valorTotalNum)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Itens</p>
            <p className="text-sm font-bold text-foreground mt-1">{totalItens}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : itens && itens.length > 0 ? (
          <ScrollArea className="flex-1 border border-border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                  <tr>
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">
                      Código
                    </th>
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">
                      Qtde
                    </th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">
                      Valor Unit.
                    </th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item: any, i: number) => (
                    <tr key={item.id || i} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-foreground">{item.codProd}</td>
                      <td className="py-2.5 px-3">
                        <div>
                          <p className="text-foreground font-medium">{item.descSaida || "—"}</p>
                          {item.descSaida && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {item.codProd}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-foreground">
                        {parseFloat(item.qtde || "0").toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-foreground">
                        {formatCurrency(parseFloat(item.valorUnit || "0"))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                        {formatCurrency(parseFloat(item.totalItem || "0"))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhum item encontrado para este pedido</p>
          </div>
        )}

        <div className="border-t border-border pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
