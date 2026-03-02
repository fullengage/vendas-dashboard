import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db functions
vi.mock("./db", () => ({
  getContas: vi.fn().mockResolvedValue([
    {
      id: 1,
      cont: "12345",
      situacao: "PAGO",
      parcela: "001",
      dtaVecto: "2025-01-15",
      valor: "1500.00",
      dtaPagto: "2025-01-14",
      valorPago: "1500.00",
      desconto: "0.00",
      razaoCli: "CLIENTE TESTE LTDA",
      cidade: "SAO PAULO",
      descricao: "BOLETO",
      razao: "EMPRESA X",
      vendedor: "JOAO SILVA",
      codEquipe: "01",
      codEmpresa: "1",
      atrasoDias: -1,
    },
    {
      id: 2,
      cont: "12346",
      situacao: "ABERTO",
      parcela: "001",
      dtaVecto: "2025-02-15",
      valor: "2000.00",
      dtaPagto: null,
      valorPago: "0.00",
      desconto: "0.00",
      razaoCli: "OUTRO CLIENTE SA",
      cidade: "RIO DE JANEIRO",
      descricao: "DUPLICATA",
      razao: "EMPRESA Y",
      vendedor: "MARIA SANTOS",
      codEquipe: "02",
      codEmpresa: "1",
      atrasoDias: 5,
    },
  ]),
  getVendedores: vi.fn().mockResolvedValue(["JOAO SILVA", "MARIA SANTOS"]),
  getCidades: vi.fn().mockResolvedValue(["SAO PAULO", "RIO DE JANEIRO"]),
  getAnos: vi.fn().mockResolvedValue(["2025", "2024"]),
  getRelatorioMensal: vi.fn().mockResolvedValue([
    {
      mes: "2025-01",
      totalValor: "1500.00",
      totalPago: "1500.00",
      totalDesconto: "0.00",
      qtdTitulos: 1,
    },
    {
      mes: "2025-02",
      totalValor: "2000.00",
      totalPago: "0.00",
      totalDesconto: "0.00",
      qtdTitulos: 1,
    },
  ]),
  getTotalRegistros: vi.fn().mockResolvedValue(2557),
  bulkUpsertContas: vi.fn().mockResolvedValue({ inserted: 5, skipped: 0 }),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("contas router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    caller = appRouter.createCaller(createPublicContext());
  });

  it("contas.list returns records", async () => {
    const result = await caller.contas.list({});
    expect(result).toHaveLength(2);
    expect(result[0].cont).toBe("12345");
    expect(result[0].vendedor).toBe("JOAO SILVA");
    expect(result[1].cont).toBe("12346");
  });

  it("contas.list accepts filter parameters", async () => {
    const result = await caller.contas.list({
      vendedor: "JOAO SILVA",
      ano: "2025",
    });
    expect(result).toHaveLength(2);
  });

  it("contas.vendedores returns list of vendedores", async () => {
    const result = await caller.contas.vendedores();
    expect(result).toEqual(["JOAO SILVA", "MARIA SANTOS"]);
  });

  it("contas.cidades returns list of cidades", async () => {
    const result = await caller.contas.cidades();
    expect(result).toEqual(["SAO PAULO", "RIO DE JANEIRO"]);
  });

  it("contas.anos returns list of anos", async () => {
    const result = await caller.contas.anos();
    expect(result).toEqual(["2025", "2024"]);
  });

  it("contas.relatorioMensal returns monthly data", async () => {
    const result = await caller.contas.relatorioMensal({});
    expect(result).toHaveLength(2);
    expect(result[0].mes).toBe("2025-01");
    expect(result[0].totalValor).toBe("1500.00");
    expect(result[1].mes).toBe("2025-02");
  });

  it("contas.relatorioMensal accepts filter parameters", async () => {
    const result = await caller.contas.relatorioMensal({
      vendedor: "JOAO SILVA",
      ano: "2025",
    });
    expect(result).toHaveLength(2);
  });

  it("contas.totalRegistros returns count", async () => {
    const result = await caller.contas.totalRegistros();
    expect(result).toBe(2557);
  });

  it("contas.importCsv processes records and returns result", async () => {
    const result = await caller.contas.importCsv({
      records: [
        {
          CONT: "99999",
          "SITUAÇÃO": "ABERTO",
          "PROVISÃO": "",
          "NUM. NF": "123",
          "CÓD. PESSOA": "456",
          PARCELA: "001",
          "NUM. ECF/SÉRIE NF": "",
          "DTA. TRANSF. BORDERAUX": "",
          "CTRL. VÁRIOS DOCS": "",
          "DTA. VECTO.": "15/03/2025",
          VALOR: "1.500,00",
          "DTA. PAGTO.": "",
          "VALOR PAGO": "0",
          "TIPO DOC.": "NF",
          "DESC. DESCONTO": "",
          DESCONTO: "0",
          "DESC. VALOR": "",
          "DTA. EMISSÃO": "01/03/2025",
          "TIPO PAGTO.": "",
          OBS: "",
          "SIT. DOC.": "",
          "REGIÃO": "SUDESTE",
          "RAZÃO CLI.": "CLIENTE NOVO",
          CIDADE: "CAMPINAS",
          "DESCRIÇÃO": "BOLETO",
          "RAZÃO": "EMPRESA Z",
          VENDEDOR: "PEDRO SOUZA",
          "CÓD. EQUIPE": "01",
          "CÓD. EMPRESA": "1",
          DOCUMENTO: "DOC123",
          "APELIDO EMP.": "EMP1",
          "ATRASO DIAS": "0",
        },
      ],
    });

    expect(result.total).toBe(1);
    expect(result.inserted).toBe(5);
    expect(result.skipped).toBe(0);
  });

  it("importCsv correctly parses Brazilian date format", async () => {
    const { bulkUpsertContas } = await import("./db");
    
    await caller.contas.importCsv({
      records: [
        {
          CONT: "88888",
          PARCELA: "001",
          "CÓD. EMPRESA": "1",
          "DTA. VECTO.": "25/12/2024",
          VALOR: "3.456,78",
          "DTA. PAGTO.": "24/12/2024",
          "VALOR PAGO": "3.456,78",
          DESCONTO: "100,50",
          "ATRASO DIAS": "-1",
        },
      ],
    });

    expect(bulkUpsertContas).toHaveBeenCalled();
    const lastCall = (bulkUpsertContas as any).mock.calls.at(-1);
    const record = lastCall[0][0];
    
    expect(record.cont).toBe("88888");
    expect(record.dtaVecto).toBe("2024-12-25");
    expect(record.dtaPagto).toBe("2024-12-24");
    expect(record.valor).toBe("3456.78");
    expect(record.valorPago).toBe("3456.78");
    expect(record.desconto).toBe("100.50");
    expect(record.atrasoDias).toBe(-1);
  });
});
