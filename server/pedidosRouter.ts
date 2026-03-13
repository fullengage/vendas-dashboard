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
  getHistoricoPedidosCliente,
  getProdutosCompradosCliente,
  getUltimoPedidoCliente,
  getDiasSemComprarCliente,
  listaPedidosComFiltros,
  contaPedidosComFiltros,
  buscaPedidosPorNumero,
  validarWhatsAppLead,
  validarWhatsAppTodos,
  obterEstatisticasWhatsApp,
  consultarBrasilAPI,
  enriquecerLeadComBrasilAPI,
  enriquecerTodosLeadsComBrasilAPI,
  importarPedidosVendaProdutos,
} from "./db";
import { parsePedidosCSV, calculateFileHash } from "./parsers/pedidosParser";
import { parsePedidosVendaProdutosCSV, calculateFileHashPedidosVendaProdutos } from "./parsers/pedidosVendaProdutosParser";

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
        
        const batchId = await createImportBatch(input.filename, fileHash, pedidos.length);
        const result = await importPedidos(pedidos, batchId);
        
        for (const error of errors) {
          await logImportError(batchId, error.rowNumber, error.error, error.rawRow);
        }
        
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
  
  historicoCompleto: publicProcedure
    .input(z.object({ codPessoa: z.string() }))
    .query(async ({ input }) => {
      const [pedidos, produtos, ultimoPedido, diasSemComprar] = await Promise.all([
        getHistoricoPedidosCliente(input.codPessoa),
        getProdutosCompradosCliente(input.codPessoa),
        getUltimoPedidoCliente(input.codPessoa),
        getDiasSemComprarCliente(input.codPessoa),
      ]);
      return { pedidos, produtos, ultimoPedido, diasSemComprar };
    }),
  
  historicoCliente: publicProcedure
    .input(z.object({ codPessoa: z.string() }))
    .query(async ({ input }) => {
      return getHistoricoPedidosCliente(input.codPessoa);
    }),
  
  produtosComprados: publicProcedure
    .input(z.object({ codPessoa: z.string() }))
    .query(async ({ input }) => {
      return getProdutosCompradosCliente(input.codPessoa);
    }),
  
  ultimoPedido: publicProcedure
    .input(z.object({ codPessoa: z.string() }))
    .query(async ({ input }) => {
      return getUltimoPedidoCliente(input.codPessoa);
    }),
  
  diasSemComprar: publicProcedure
    .input(z.object({ codPessoa: z.string() }))
    .query(async ({ input }) => {
      return getDiasSemComprarCliente(input.codPessoa);
    }),
  
  listaComFiltros: publicProcedure
    .input(z.object({
      codPessoa: z.string().optional(),
      codUsuario: z.string().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      isFaturado: z.boolean().optional(),
      limite: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return listaPedidosComFiltros(input);
    }),
  
  contaComFiltros: publicProcedure
    .input(z.object({
      codPessoa: z.string().optional(),
      codUsuario: z.string().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      isFaturado: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      return contaPedidosComFiltros(input);
    }),
  
  buscaPorNumero: publicProcedure
    .input(z.object({ codPedido: z.string() }))
    .query(async ({ input }) => {
      return buscaPedidosPorNumero(input.codPedido);
    }),
});


// Endpoints de validação de WhatsApp (adicionar antes do fechamento do router)
// Nota: Adicionar manualmente no pedidosRouter.ts antes do fechamento

export const whatsappRouter = router({
  validarLead: publicProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ input }) => {
      const temWhatsApp = await validarWhatsAppLead(input.leadId);
      return { success: true, temWhatsApp };
    }),
  
  validarTodos: publicProcedure
    .mutation(async () => {
      return validarWhatsAppTodos();
    }),
  
  obterEstatisticas: publicProcedure
    .query(async () => {
      return obterEstatisticasWhatsApp();
    }),
});


export const brasilApiRouter = router({
  consultarCNPJ: publicProcedure
    .input(z.object({ cnpj: z.string() }))
    .query(async ({ input }) => {
      const dados = await consultarBrasilAPI(input.cnpj);
      return dados || { error: 'CNPJ nao encontrado' };
    }),
  
  enriquecerLead: publicProcedure
    .input(z.object({ leadId: z.number(), cnpj: z.string() }))
    .mutation(async ({ input }) => {
      return enriquecerLeadComBrasilAPI(input.leadId, input.cnpj);
    }),
  
  enriquecerTodos: publicProcedure
    .mutation(async () => {
      return enriquecerTodosLeadsComBrasilAPI();
    }),
  
  importarPedidosVendaProdutosCSV: publicProcedure
    .input(
      z.object({
        filename: z.string(),
        content: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const fileHash = calculateFileHashPedidosVendaProdutos(input.content);
        const { pedidos, errors } = parsePedidosVendaProdutosCSV(input.content);
        
        const batchId = await createImportBatch(input.filename, fileHash, pedidos.length);
        const result = await importarPedidosVendaProdutos(pedidos, batchId);
        
        for (const error of errors) {
          await logImportError(batchId, error.rowNumber, error.error, error.rawRow);
        }
        
        await updateImportBatch(batchId, result.created + result.updated, errors.length, "completed");
        
        return {
          success: true,
          message: `Importação concluída: ${result.created} novos, ${result.updated} atualizados, ${errors.length} erros`,
          created: result.created,
          updated: result.updated,
          errors: result.errors,
          batchId,
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Erro desconhecido",
          created: 0,
          updated: 0,
          errors: [error instanceof Error ? error.message : "Erro desconhecido"],
          batchId: 0,
        };
      }
    }),
});
