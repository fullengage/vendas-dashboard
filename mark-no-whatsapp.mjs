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

async function markNoWhatsApp() {
  const connection = await pool.getConnection();

  try {
    console.log("📱 Marcando todos os leads como 'sem WhatsApp' (dados de telefone não disponíveis)...");

    // Atualizar todos os leads para status 2 (sem WhatsApp)
    const [result] = await connection.query("UPDATE leads SET has_whatsapp = 2 WHERE has_whatsapp IS NULL OR has_whatsapp = 0");

    console.log(`✅ ${result.affectedRows} leads marcados como 'sem WhatsApp'`);
    console.log(`\n💡 Próximo passo: Executar enriquecimento com BrasilAPI para obter dados de telefone`);
  } catch (error) {
    console.error("❌ Erro ao marcar leads:", error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

markNoWhatsApp();
