import { describe, it, expect, beforeAll } from "vitest";
import {
  getHistoricoPedidosCliente,
  getProdutosCompradosCliente,
  getUltimoPedidoCliente,
  getDiasSemComprarCliente,
} from "./db";

describe("Pedidos - Histórico do Cliente", () => {
  // Usar um cliente que tem pedidos importados
  const codPessoaTeste = "CLIENTE001";

  describe("getHistoricoPedidosCliente", () => {
    it("deve retornar array de pedidos", async () => {
      const pedidos = await getHistoricoPedidosCliente(codPessoaTeste);
      expect(Array.isArray(pedidos)).toBe(true);
    });

    it("pedidos devem ter campos obrigatórios", async () => {
      const pedidos = await getHistoricoPedidosCliente(codPessoaTeste);
      if (pedidos.length > 0) {
        const pedido = pedidos[0];
        expect(pedido).toHaveProperty("id");
        expect(pedido).toHaveProperty("codPedido");
        expect(pedido).toHaveProperty("dtaEmissao");
        expect(pedido).toHaveProperty("valorTotal");
        expect(pedido).toHaveProperty("isFaturado");
      }
    });

    it("pedidos devem estar ordenados por data decrescente", async () => {
      const pedidos = await getHistoricoPedidosCliente(codPessoaTeste);
      if (pedidos.length > 1) {
        for (let i = 0; i < pedidos.length - 1; i++) {
          const data1 = new Date(pedidos[i].dtaEmissao);
          const data2 = new Date(pedidos[i + 1].dtaEmissao);
          expect(data1.getTime()).toBeGreaterThanOrEqual(data2.getTime());
        }
      }
    });
  });

  describe("getProdutosCompradosCliente", () => {
    it("deve retornar array de produtos", async () => {
      const produtos = await getProdutosCompradosCliente(codPessoaTeste);
      expect(Array.isArray(produtos)).toBe(true);
    });

    it("produtos devem ter campos de agregação", async () => {
      const produtos = await getProdutosCompradosCliente(codPessoaTeste);
      if (produtos.length > 0) {
        const produto = produtos[0];
        expect(produto).toHaveProperty("codProd");
        expect(produto).toHaveProperty("descSaida");
        expect(produto).toHaveProperty("qtdTotal");
        expect(produto).toHaveProperty("nroPedidos");
        expect(produto).toHaveProperty("ultimaCompra");
      }
    });

    it("quantidade total deve ser número positivo", async () => {
      const produtos = await getProdutosCompradosCliente(codPessoaTeste);
      if (produtos.length > 0) {
        const qtd = parseFloat(produtos[0].qtdTotal || "0");
        expect(qtd).toBeGreaterThan(0);
      }
    });

    it("número de pedidos deve ser positivo", async () => {
      const produtos = await getProdutosCompradosCliente(codPessoaTeste);
      if (produtos.length > 0) {
        expect(produtos[0].nroPedidos).toBeGreaterThan(0);
      }
    });
  });

  describe("getUltimoPedidoCliente", () => {
    it("deve retornar último pedido ou null", async () => {
      const ultimoPedido = await getUltimoPedidoCliente(codPessoaTeste);
      if (ultimoPedido) {
        expect(ultimoPedido).toHaveProperty("id");
        expect(ultimoPedido).toHaveProperty("codPedido");
        expect(ultimoPedido).toHaveProperty("dtaEmissao");
      }
    });

    it("último pedido deve incluir itens", async () => {
      const ultimoPedido = await getUltimoPedidoCliente(codPessoaTeste);
      if (ultimoPedido) {
        expect(ultimoPedido).toHaveProperty("itens");
        expect(Array.isArray(ultimoPedido.itens)).toBe(true);
      }
    });

    it("itens devem ter campos obrigatórios", async () => {
      const ultimoPedido = await getUltimoPedidoCliente(codPessoaTeste);
      if (ultimoPedido && ultimoPedido.itens && ultimoPedido.itens.length > 0) {
        const item = ultimoPedido.itens[0];
        expect(item).toHaveProperty("codProd");
        expect(item).toHaveProperty("descSaida");
        expect(item).toHaveProperty("qtde");
      }
    });
  });

  describe("getDiasSemComprarCliente", () => {
    it("deve retornar objeto com diasSemComprar", async () => {
      const resultado = await getDiasSemComprarCliente(codPessoaTeste);
      expect(resultado).toHaveProperty("diasSemComprar");
      expect(resultado).toHaveProperty("ultimaCompraFaturada");
      expect(resultado).toHaveProperty("temComprasFaturadas");
    });

    it("diasSemComprar deve ser número ou null", async () => {
      const resultado = await getDiasSemComprarCliente(codPessoaTeste);
      if (resultado.diasSemComprar !== null) {
        expect(typeof resultado.diasSemComprar).toBe("number");
        expect(resultado.diasSemComprar).toBeGreaterThanOrEqual(0);
      }
    });

    it("temComprasFaturadas deve ser boolean", async () => {
      const resultado = await getDiasSemComprarCliente(codPessoaTeste);
      expect(typeof resultado.temComprasFaturadas).toBe("boolean");
    });

    it("se temComprasFaturadas é true, deve ter ultimaCompraFaturada", async () => {
      const resultado = await getDiasSemComprarCliente(codPessoaTeste);
      if (resultado.temComprasFaturadas) {
        expect(resultado.ultimaCompraFaturada).toBeTruthy();
      }
    });
  });
});
