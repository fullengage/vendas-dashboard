# TODO - Upgrade para Banco de Dados

## Fase 1: Upgrade do projeto
- [x] Executar webdev_add_feature para web-db-user
- [x] Verificar estrutura do projeto após upgrade

## Fase 2: Schema e API
- [x] Criar tabela `contas_receber` com todos os campos do CSV
- [x] Criar constraint UNIQUE para evitar duplicidade (CONT + PARCELA + COD_EMPRESA)
- [x] Criar API POST /api/import para importar CSV (via tRPC importCsv)
- [x] Criar API GET /api/contas para listar dados com filtros
- [x] Criar API GET /api/relatorio-mensal para relatório mensal
- [x] Criar API GET /api/vendedores para stats de vendedores
- [x] Migrar dados de 2025 para o banco (2557 registros)

## Fase 3: Frontend
- [x] Atualizar hooks para consumir APIs via tRPC
- [x] Adicionar filtro por ano no dashboard
- [x] Adicionar página de Relatório Mensal detalhado
- [x] Adicionar funcionalidade de upload de CSV

## Fase 4: Upload sem duplicidade
- [x] Criar página de upload de CSV com prévia dos dados
- [x] Implementar lógica de upsert (ON DUPLICATE KEY UPDATE) no backend
- [x] Feedback visual de quantos registros novos vs duplicados

## Fase 5: Testar e entregar
- [x] Escrever testes vitest (11 testes passando)
- [x] Dashboard carregando dados do banco com sucesso
- [x] Checkpoint e entrega

## Fase 6: Relatório por Região e Estado
- [x] Analisar dados de região e cidade/estado existentes no banco
- [x] Criar mapeamento cidade → estado → região no shared/cidadeEstado.ts
- [x] Criar query SQL getRelatorioPorCidade com filtros de ano e vendedor
- [x] Criar endpoint tRPC relatorioPorCidade
- [x] Criar página RelatorioRegiao.tsx com KPI cards, gráficos e tabela
- [x] Adicionar KPI cards por região clicáveis como filtro
- [x] Adicionar gráfico de barras faturamento por região
- [x] Adicionar gráfico de pizza participação por região
- [x] Adicionar aba Por Estado com gráfico horizontal
- [x] Adicionar aba Top Cidades com gráfico
- [x] Adicionar tabela detalhada por estado com ordenação
- [x] Adicionar botão "Região / Estado" no dashboard principal
- [x] Adicionar rota /relatorio-regiao no App.tsx
- [x] Escrever testes vitest para o novo endpoint (13 testes passando)
- [x] Checkpoint e entrega

## Fase 7: Filtro Mensal no Relatório por Região
- [x] Adicionar parâmetro de mês no endpoint relatorioPorCidade
- [x] Adicionar Select de mês no header da página RelatorioRegiao
- [x] Atualizar testes vitest
- [x] Checkpoint e entrega

## Fase 8: Detalhe do Vendedor e Histórico do Cliente
- [x] Criar endpoint detalheVendedor (KPIs, evolução mensal, clientes)
- [x] Criar endpoint historicoCliente (títulos, última compra, frequência)
- [x] Criar página /vendedor/:nome com desempenho e lista de clientes
- [x] Mostrar última compra, frequência anual e ticket médio por cliente
- [x] Criar página /cliente/:nome com histórico completo de compras
- [x] Ao clicar no vendedor na tabela do dashboard, navegar para detalhe
- [x] Ao clicar no cliente na lista do vendedor, navegar para histórico
- [x] Testes vitest para os novos endpoints (13 testes passando)
- [x] Checkpoint e entrega


## Fase 9: Melhorias de UX - Scroll Vertical
- [x] Adicionar scroll vertical nas tabelas de clientes e títulos
- [x] Definir altura máxima para tabelas e permitir rolagem


## Fase 10: Scroll Vertical em Todas as Tabelas
- [x] Adicionar scroll vertical na tabela de Relatório Mensal (Detalhamento Mensal)
- [x] Adicionar scroll vertical na tabela de Relatório por Região (Detalhamento por Estado)
- [x] Aumentar altura máxima das tabelas para 600px
- [x] Adicionar z-index sticky no header para manter visível durante scroll


## Fase 11: Módulo de Pedidos de Venda x Produtos
- [ ] Analisar estrutura do CSV e mapear colunas para o banco
- [ ] Criar migrations para orders, order_items, import_batches, import_errors
- [ ] Implementar parser CSV com encoding ISO-8859-1 e separador ;
- [ ] Criar importador com upsert e idempotência (file_hash)
- [ ] Criar endpoints tRPC para pedidos (listar, detalhe, por cliente)
- [ ] Criar tela de histórico de pedidos do cliente
- [ ] Criar relatório de pedidos por vendedor
- [ ] Testar e validar integração

## Fase 12: Melhorar Histórico do Cliente - Ferramenta Comercial Completa
- [x] Analisar schema de pedidos e criar procedures tRPC para histórico completo
- [x] Criar endpoint tRPC para histórico de pedidos (faturados e não faturados)
- [x] Criar endpoint tRPC para produtos já comprados com agregações
- [x] Criar endpoint tRPC para último pedido e dias sem comprar
- [x] Implementar tabela de histórico de pedidos com status e destaque visual
- [x] Implementar seção de produtos já comprados com busca
- [x] Implementar card de último pedido com ação "Ligar novamente"
- [x] Implementar card KPI de dias sem comprar com alertas por cor
- [x] Escrever testes vitest para os novos endpoints (14 testes passando)
- [x] Testar e validar integração na página do cliente


## Fase 13: Exibir Produtos/Itens no Histórico de Pedidos
- [x] Criar função para obter itens do pedido com detalhes (desc_saida, qtde, valor)
- [x] Implementar modal/drawer de detalhes do pedido com lista de itens
- [x] Adicionar ação "Ver detalhes" em cada linha da tabela de pedidos
- [x] Melhorar getProdutosCompradosCliente para usar desc_saida corretamente
- [x] Testar exibição de produtos no modal
- [x] Escrever testes vitest para novas funções (27 testes passando)


## Fase 14: Nova Página de Histórico de Pedidos e Produtos
- [x] Criar função backend para listar todos os pedidos com filtros (cliente, período, status)
- [x] Criar função backend para listar itens de um pedido
- [x] Implementar página PedidosHistorico.tsx com tabela de pedidos
- [x] Adicionar filtros: cliente, período, status, vendedor
- [x] Adicionar busca por número de pedido
- [x] Implementar modal de detalhes com itens do pedido
- [x] Adicionar paginação
- [x] Escrever testes vitest para novos endpoints (27 testes passando)


## Fase 15: Importar Leads e Criar P\u00e1gina de Prospec\u00e7\u00e3o## Fase 15: Importar Leads e Criar Página de Prospecção WhatsApp
- [x] Criar tabela leads no banco de dados com campos: id, razao_social, nome_fantasia, cnpj, cpf, email, telefone, celular, endereco, cidade, estado, cep, status_contato, observacoes, created_at
- [x] Criar função de import do CSV para tabela leads
- [ ] Importar 998 clientes/leads do arquivo CSV (em progresso)
- [x] Criar endpoints tRPC para listar leads, atualizar status, adicionar observações
- [x] Criar página Prospecção.tsx com tabela de leads
- [x] Adicionar filtros: status de contato, cidade, estado, busca por nome/cnpj
- [x] Adicionar botão "Enviar WhatsApp" que abre chat do WhatsApp
- [x] Adicionar coluna de status de contato (Não contatado, Contatado, Interessado, Proposta enviada, Fechado)
- [x] Adicionar campo de observações para cada lead
- [ ] Escrever testes vitest para novos endpoints
