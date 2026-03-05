import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { parse } from "csv-parse/sync";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database connection config
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "vendas_dashboard",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Parse DATABASE_URL if provided
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  dbConfig.host = url.hostname;
  dbConfig.user = url.username;
  dbConfig.password = url.password;
  dbConfig.database = url.pathname.slice(1);
  dbConfig.ssl = { rejectUnauthorized: false };
}

async function importLeadsBatch() {
  let connection;

  try {
    // Read CSV file
    const csvPath = "/home/ubuntu/upload/clientes_rows(1).csv";
    console.log(`📖 Lendo arquivo CSV: ${csvPath}`);

    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      encoding: "utf-8",
    });

    console.log(`✅ CSV lido com sucesso! Total de registros: ${records.length}`);

    // Connect to database
    console.log("🔌 Conectando ao banco de dados...");
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Conectado ao banco de dados!");

    // Configuration for batch import
    const batchSize = 50; // Import 50 records at a time
    const totalBatches = Math.ceil(records.length / batchSize);

    let totalInserted = 0;
    let totalUpdated = 0;

    // Process records in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min(startIdx + batchSize, records.length);
      const batchRecords = records.slice(startIdx, endIdx);

      console.log(
        `\n📦 Processando lote ${batchIndex + 1}/${totalBatches} (registros ${startIdx + 1}-${endIdx})...`
      );

      let batchInserted = 0;
      let batchUpdated = 0;

      for (const record of batchRecords) {
        try {
          // Map CSV fields to database fields
          const lead = {
            razao_social: record.razao_social || null,
            nome_fantasia: record.nome_fantasia || null,
            cnpj: record.cnpj || null,
            cpf: record.cpf || null,
            email: record.email || null,
            telefone: record.telefone || null,
            celular: record.celular || null,
            endereco: record.endereco || null,
            numero: record.numero || null,
            bairro: record.bairro || null,
            cidade: record.cidade || null,
            estado: record.estado || null,
            cep: record.cep || null,
            status_contato: "Não contatado", // Default status
            observacoes: record.observacoes || null,
          };

          // Check if lead already exists (by CNPJ or email)
          let existingLead = null;

          if (lead.cnpj) {
            const [rows] = await connection.execute(
              "SELECT id FROM leads WHERE cnpj = ?",
              [lead.cnpj]
            );
            if (rows.length > 0) {
              existingLead = rows[0];
            }
          }

          if (!existingLead && lead.email) {
            const [rows] = await connection.execute(
              "SELECT id FROM leads WHERE email = ?",
              [lead.email]
            );
            if (rows.length > 0) {
              existingLead = rows[0];
            }
          }

          if (existingLead) {
            // Update existing lead
            await connection.execute(
              `UPDATE leads SET 
                razao_social = ?, nome_fantasia = ?, cpf = ?, 
                telefone = ?, celular = ?, endereco = ?, numero = ?, 
                bairro = ?, cidade = ?, estado = ?, cep = ?, 
                observacoes = ?, updated_at = NOW()
              WHERE id = ?`,
              [
                lead.razao_social,
                lead.nome_fantasia,
                lead.cpf,
                lead.telefone,
                lead.celular,
                lead.endereco,
                lead.numero,
                lead.bairro,
                lead.cidade,
                lead.estado,
                lead.cep,
                lead.observacoes,
                existingLead.id,
              ]
            );
            batchUpdated++;
          } else {
            // Insert new lead
            await connection.execute(
              `INSERT INTO leads (
                razao_social, nome_fantasia, cnpj, cpf, email, 
                telefone, celular, endereco, numero, bairro, 
                cidade, estado, cep, status_contato, observacoes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                lead.razao_social,
                lead.nome_fantasia,
                lead.cnpj,
                lead.cpf,
                lead.email,
                lead.telefone,
                lead.celular,
                lead.endereco,
                lead.numero,
                lead.bairro,
                lead.cidade,
                lead.estado,
                lead.cep,
                lead.status_contato,
                lead.observacoes,
              ]
            );
            batchInserted++;
          }
        } catch (err) {
          console.error(`❌ Erro ao processar registro:`, err.message);
        }
      }

      totalInserted += batchInserted;
      totalUpdated += batchUpdated;

      console.log(
        `✅ Lote ${batchIndex + 1} concluído: ${batchInserted} inseridos, ${batchUpdated} atualizados`
      );

      // Small delay between batches to avoid overwhelming the database
      if (batchIndex < totalBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log("\n✅ Importação concluída!");
    console.log(`📊 Total de registros processados: ${totalInserted + totalUpdated}`);
    console.log(`✨ Novos leads inseridos: ${totalInserted}`);
    console.log(`🔄 Leads atualizados: ${totalUpdated}`);

    // Verify import
    const [result] = await connection.execute("SELECT COUNT(*) as total FROM leads");
    console.log(`\n📈 Total de leads no banco: ${result[0].total}`);
  } catch (error) {
    console.error("❌ Erro durante importação:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 Conexão fechada");
    }
  }
}

// Run import
importLeadsBatch();
