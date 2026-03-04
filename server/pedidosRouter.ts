import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  importPedidos,
  createImportBatch,
  updateImportBatch,
  logImportError,
  getPedidosPorCliente,
  getItensPedido,
  getPedidosPorVendedor,
} from "./db";
import { parsePedidosCSV, calculateFileHash } from "./parsers/pedidosParser";

export const pedidosRouter = router({
  importCSV: publicProcedure
    .input(
      z.object({
        filename: z.string(),
        content: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const fileHash = calculateFileHash(input.content);
        const { pedidos, errors } = parsePedidosCSV(input.content);
        
        // Criar lote de importacao
        const batchId = await createImportBatch(input.filename, fileHash, pedidos.length);
        
        // Importar pedidos
        const result = await importPedidos(pedidos, batchId);
        
        // Registrar erros
        for (const error of errors) {
          await logImportError(batchId, error.rowNumber, error.error, error.rawRow);
        }
        
        // Atualizar status do lote
        await updateImportBatch(batchId, result.created + result.updated, errors.length, "completed");
        
        return {
          success: true,
          batchId,
          created: result.created,
          updated: result.updated,
          errors: result.errors,
          parseErrors: errors.length,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    }),
  
  getPedidosPorCliente: publicProcedure
    .input(z.object({ codPessoa: z.string() }))
    .query(async ({ input }) => {
      return getPedidosPorCliente(input.codPessoa);
    }),
  
  getItensPedido: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      return getItensPedido(input.orderId);
    }),
  
  getPedidosPorVendedor: publicProcedure
    .input(z.object({ codUsuario: z.string() }))
    .query(async ({ input }) => {
      return getPedidosPorVendedor(input.codUsuario);
    }),
});
