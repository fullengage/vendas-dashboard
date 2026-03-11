import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DATABASE_URL?.split("@")[1]?.split(":")[0] || "localhost",
  user: process.env.DATABASE_URL?.split("://")[1]?.split(":")[0] || "root",
  password: process.env.DATABASE_URL?.split(":")[2]?.split("@")[0] || "",
  database: process.env.DATABASE_URL?.split("/").pop()?.split("?")[0] || "vendas",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false },
});

// Função para validar formato de número de telefone brasileiro
function isValidBrazilianPhone(phone) {
  if (!phone) return false;
  // Remove caracteres especiais
  const cleaned = phone.replace(/\D/g, "");
  // Valida se tem 11 dígitos (2 DDD + 9 dígitos)
  return cleaned.length === 11 && cleaned.startsWith("11");
}

async function validateWhatsAppBatch() {
  const connection = await pool.getConnection();

  try {
    console.log("🔍 Iniciando validação de WhatsApp em lote...");

    // Buscar todos os leads
    const [leads] = await connection.query("SELECT id, celular FROM leads LIMIT 1000");

    console.log(`📱 Total de leads para validar: ${leads.length}`);

    let validCount = 0;
    let invalidCount = 0;
    let batchSize = 50;

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);

      for (const lead of batch) {
        const hasWhatsapp = isValidBrazilianPhone(lead.celular) ? 1 : 2;

        await connection.query("UPDATE leads SET has_whatsapp = ? WHERE id = ?", [
          hasWhatsapp,
          lead.id,
        ]);

        if (hasWhatsapp === 1) {
          validCount++;
        } else {
          invalidCount++;
        }
      }

      console.log(`✅ Processados ${Math.min(i + batchSize, leads.length)} de ${leads.length} leads`);

      // Aguardar 500ms entre lotes para não sobrecarregar
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`\n📊 Resultado da validação:`);
    console.log(`✓ Leads com WhatsApp válido: ${validCount}`);
    console.log(`✗ Leads sem WhatsApp válido: ${invalidCount}`);
    console.log(`📈 Taxa de validação: ${((validCount / leads.length) * 100).toFixed(2)}%`);
  } catch (error) {
    console.error("❌ Erro ao validar WhatsApp:", error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

validateWhatsAppBatch();
