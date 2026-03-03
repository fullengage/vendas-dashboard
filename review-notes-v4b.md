# Review Notes V4b - Detalhe Vendedor CAMILA

A tabela de clientes funciona perfeitamente: 5 clientes, com faturado, recebido, títulos, ticket médio, última compra, frequência e atraso.
Os nomes dos clientes são clicáveis (links verdes).
A frequência mostra corretamente: Esporádico, Raro, com meses.

PROBLEMA: Os KPIs no topo estão zerados (R$ 0,00, 0 clientes, 0 títulos) apesar da tabela mostrar dados.
Isso indica que o endpoint detalheVendedor retorna null ou dados zerados.
A query getDetalheVendedor provavelmente não está retornando dados corretamente.
O endpoint clientesDoVendedor funciona (tabela tem dados), mas detalheVendedor não.

CAUSA PROVÁVEL: A query detalheVendedor usa destructuring [kpis] que pode não funcionar se o resultado for um array.
Preciso verificar e corrigir a query.
