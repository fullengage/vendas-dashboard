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

/**
 * Pedidos de Venda
 * Chave única: cod_pedido para evitar duplicidade
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  codPedido: varchar("cod_pedido", { length: 20 }).notNull().unique(),
  codPessoa: varchar("cod_pessoa", { length: 20 }).notNull(), // Cliente
  codUsuario: varchar("cod_usuario", { length: 20 }), // Vendedor
  codEquipe: varchar("cod_equipe", { length: 20 }),
  dtaEmissao: varchar("dta_emissao", { length: 10 }).notNull(), // dd/mm/yyyy
  dtaEntrega: varchar("dta_entrega", { length: 10 }),
  dtaFaturamento: varchar("dta_faturamento", { length: 10 }),
  valorTotal: decimal("valor_total", { precision: 15, scale: 2 }).default("0"),
  desconto: decimal("desconto", { precision: 15, scale: 2 }).default("0"),
  valorFinal: decimal("valor_final", { precision: 15, scale: 2 }).default("0"),
  situacao: varchar("situacao", { length: 50 }), // NORMAL, CANCELADO, etc
  descSit: varchar("desc_sit", { length: 100 }),
  codStatus: varchar("cod_status", { length: 20 }),
  formaPagto: varchar("forma_pagto", { length: 50 }),
  obs: text("obs"),
  importBatchId: int("import_batch_id"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Itens do Pedido
 * Chave única: order_id + cod_prod + lote para evitar duplicidade
 */
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  codProd: varchar("cod_prod", { length: 20 }).notNull(),
  descSaida: varchar("desc_saida", { length: 255 }).notNull(),
  unidade: varchar("unidade", { length: 10 }),
  qtde: decimal("qtde", { precision: 12, scale: 2 }).default("0"),
  valorUnit: decimal("valor_unit", { precision: 12, scale: 2 }).default("0"),
  totalItem: decimal("total_item", { precision: 15, scale: 2 }).default("0"),
  desconto: decimal("desconto", { precision: 15, scale: 2 }).default("0"),
  lote: varchar("lote", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_order_prod_lote").on(table.orderId, table.codProd, table.lote),
]);

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Lotes de Importação (para rastrear e evitar duplicidade)
 */
export const importBatches = mysqlTable("import_batches", {
  id: int("id").autoincrement().primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileHash: varchar("file_hash", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending"),
  totalRows: int("total_rows").default(0),
  successRows: int("success_rows").default(0),
  errorRows: int("error_rows").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ImportBatch = typeof importBatches.$inferSelect;
export type InsertImportBatch = typeof importBatches.$inferInsert;

/**
 * Erros de Importação (para auditoria)
 */
export const importErrors = mysqlTable("import_errors", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batch_id").notNull(),
  rowNumber: int("row_number").notNull(),
  errorMessage: text("error_message"),
  rawRowJson: text("raw_row_json"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImportError = typeof importErrors.$inferSelect;
export type InsertImportError = typeof importErrors.$inferInsert;

/**
 * Tabela de leads/clientes para prospecção via WhatsApp
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  razaoSocial: varchar("razao_social", { length: 255 }).notNull(),
  nomeFantasia: varchar("nome_fantasia", { length: 255 }),
  cnpj: varchar("cnpj", { length: 20 }),
  cpf: varchar("cpf", { length: 20 }),
  email: varchar("email", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  celular: varchar("celular", { length: 20 }),
  endereco: varchar("endereco", { length: 255 }),
  numero: varchar("numero", { length: 20 }),
  complemento: varchar("complemento", { length: 255 }),
  bairro: varchar("bairro", { length: 100 }),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  cep: varchar("cep", { length: 10 }),
  statusContato: mysqlEnum("status_contato", [
    "nao_contatado",
    "contatado",
    "interessado",
    "proposta_enviada",
    "fechado",
    "rejeitado"
  ]).default("nao_contatado").notNull(),
  observacoes: text("observacoes"),
  ativo: int("ativo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
