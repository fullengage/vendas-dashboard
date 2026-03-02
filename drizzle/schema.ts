import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Contas a receber e recebidas.
 * Chave única: cont + parcela + codEmpresa para evitar duplicidade.
 */
export const contasReceber = mysqlTable("contas_receber", {
  id: int("id").autoincrement().primaryKey(),
  cont: varchar("cont", { length: 20 }).notNull(),
  situacao: varchar("situacao", { length: 10 }),
  provisao: varchar("provisao", { length: 20 }),
  numNf: varchar("num_nf", { length: 20 }),
  codPessoa: varchar("cod_pessoa", { length: 20 }),
  parcela: varchar("parcela", { length: 10 }).notNull(),
  numEcfSerieNf: varchar("num_ecf_serie_nf", { length: 20 }),
  dtaTransfBorderaux: varchar("dta_transf_borderaux", { length: 20 }),
  ctrlVariosDocs: varchar("ctrl_varios_docs", { length: 20 }),
  dtaVecto: varchar("dta_vecto", { length: 10 }),
  valor: decimal("valor", { precision: 15, scale: 2 }).default("0"),
  dtaPagto: varchar("dta_pagto", { length: 10 }),
  valorPago: decimal("valor_pago", { precision: 15, scale: 2 }).default("0"),
  tipoDoc: varchar("tipo_doc", { length: 10 }),
  descDesconto: varchar("desc_desconto", { length: 100 }),
  desconto: decimal("desconto", { precision: 15, scale: 2 }).default("0"),
  descValor: varchar("desc_valor", { length: 100 }),
  dtaEmissao: varchar("dta_emissao", { length: 10 }),
  tipoPagto: varchar("tipo_pagto", { length: 10 }),
  obs: text("obs"),
  sitDoc: varchar("sit_doc", { length: 10 }),
  regiao: varchar("regiao", { length: 50 }),
  razaoCli: varchar("razao_cli", { length: 255 }),
  cidade: varchar("cidade", { length: 100 }),
  descricao: varchar("descricao", { length: 100 }),
  razao: varchar("razao", { length: 255 }),
  vendedor: varchar("vendedor", { length: 255 }),
  codEquipe: varchar("cod_equipe", { length: 20 }),
  codEmpresa: varchar("cod_empresa", { length: 10 }).notNull(),
  documento: varchar("documento", { length: 20 }),
  apelidoEmp: varchar("apelido_emp", { length: 50 }),
  atrasoDias: int("atraso_dias"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_cont_parcela_empresa").on(table.cont, table.parcela, table.codEmpresa),
]);

export type ContaReceber = typeof contasReceber.$inferSelect;
export type InsertContaReceber = typeof contasReceber.$inferInsert;
