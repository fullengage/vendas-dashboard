import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getContas,
  getVendedores,
  getCidades,
  getAnos,
  getRelatorioMensal,
  getTotalRegistros,
  bulkUpsertContas,
  getRelatorioPorCidade,
} from "./db";
import { InsertContaReceber } from "../drizzle/schema";

function parseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || dateStr.trim() === "") return null;
  // Formats: dd/mm/yyyy or yyyy-mm-dd
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return dateStr;
}

function parseNumber(val: string | null | undefined): string {
  if (!val || val.trim() === "") return "0";
  // Brazilian format: 1.234,56 → 1234.56
  return val.replace(/\./g, "").replace(",", ".");
}

function parseInteger(val: string | null | undefined): number | null {
  if (!val || val.trim() === "") return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  contas: router({
    list: publicProcedure
      .input(
        z.object({
          vendedor: z.string().optional(),
          mes: z.string().optional(),
          cidade: z.string().optional(),
          ano: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return getContas(input ?? undefined);
      }),

    vendedores: publicProcedure.query(async () => {
      return getVendedores();
    }),

    cidades: publicProcedure.query(async () => {
      return getCidades();
    }),

    anos: publicProcedure.query(async () => {
      return getAnos();
    }),

    relatorioMensal: publicProcedure
      .input(
        z.object({
          vendedor: z.string().optional(),
          ano: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return getRelatorioMensal(input ?? undefined);
      }),

    totalRegistros: publicProcedure.query(async () => {
      return getTotalRegistros();
    }),

    relatorioPorCidade: publicProcedure
      .input(
        z.object({
          vendedor: z.string().optional(),
          ano: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return getRelatorioPorCidade(input ?? undefined);
      }),

    importCsv: publicProcedure
      .input(
        z.object({
          records: z.array(
            z.object({
              CONT: z.string(),
              SITUAÇÃO: z.string().optional().default(""),
              PROVISÃO: z.string().optional().default(""),
              "NUM. NF": z.string().optional().default(""),
              "CÓD. PESSOA": z.string().optional().default(""),
              PARCELA: z.string(),
              "NUM. ECF/SÉRIE NF": z.string().optional().default(""),
              "DTA. TRANSF. BORDERAUX": z.string().optional().default(""),
              "CTRL. VÁRIOS DOCS": z.string().optional().default(""),
              "DTA. VECTO.": z.string().optional().default(""),
              VALOR: z.string().optional().default("0"),
              "DTA. PAGTO.": z.string().optional().default(""),
              "VALOR PAGO": z.string().optional().default("0"),
              "TIPO DOC.": z.string().optional().default(""),
              "DESC. DESCONTO": z.string().optional().default(""),
              DESCONTO: z.string().optional().default("0"),
              "DESC. VALOR": z.string().optional().default(""),
              "DTA. EMISSÃO": z.string().optional().default(""),
              "TIPO PAGTO.": z.string().optional().default(""),
              OBS: z.string().optional().default(""),
              "SIT. DOC.": z.string().optional().default(""),
              REGIÃO: z.string().optional().default(""),
              "RAZÃO CLI.": z.string().optional().default(""),
              CIDADE: z.string().optional().default(""),
              DESCRIÇÃO: z.string().optional().default(""),
              RAZÃO: z.string().optional().default(""),
              VENDEDOR: z.string().optional().default(""),
              "CÓD. EQUIPE": z.string().optional().default(""),
              "CÓD. EMPRESA": z.string(),
              DOCUMENTO: z.string().optional().default(""),
              "APELIDO EMP.": z.string().optional().default(""),
              "ATRASO DIAS": z.string().optional().default(""),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const contas: InsertContaReceber[] = input.records.map((r) => ({
          cont: r.CONT,
          situacao: r["SITUAÇÃO"] || null,
          provisao: r["PROVISÃO"] || null,
          numNf: r["NUM. NF"] || null,
          codPessoa: r["CÓD. PESSOA"] || null,
          parcela: r.PARCELA,
          numEcfSerieNf: r["NUM. ECF/SÉRIE NF"] || null,
          dtaTransfBorderaux: r["DTA. TRANSF. BORDERAUX"] || null,
          ctrlVariosDocs: r["CTRL. VÁRIOS DOCS"] || null,
          dtaVecto: parseDate(r["DTA. VECTO."]),
          valor: parseNumber(r.VALOR),
          dtaPagto: parseDate(r["DTA. PAGTO."]),
          valorPago: parseNumber(r["VALOR PAGO"]),
          tipoDoc: r["TIPO DOC."] || null,
          descDesconto: r["DESC. DESCONTO"] || null,
          desconto: parseNumber(r.DESCONTO),
          descValor: r["DESC. VALOR"] || null,
          dtaEmissao: parseDate(r["DTA. EMISSÃO"]),
          tipoPagto: r["TIPO PAGTO."] || null,
          obs: r.OBS || null,
          sitDoc: r["SIT. DOC."] || null,
          regiao: r["REGIÃO"] || null,
          razaoCli: r["RAZÃO CLI."] || null,
          cidade: r.CIDADE || null,
          descricao: r["DESCRIÇÃO"] || null,
          razao: r["RAZÃO"] || null,
          vendedor: r.VENDEDOR || null,
          codEquipe: r["CÓD. EQUIPE"] || null,
          codEmpresa: r["CÓD. EMPRESA"],
          documento: r.DOCUMENTO || null,
          apelidoEmp: r["APELIDO EMP."] || null,
          atrasoDias: parseInteger(r["ATRASO DIAS"]),
        }));

        const result = await bulkUpsertContas(contas);
        return {
          total: input.records.length,
          inserted: result.inserted,
          skipped: result.skipped,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
