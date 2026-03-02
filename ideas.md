# Brainstorm de Design - Dashboard de Vendas UNIX PACK

## Contexto
Dashboard analítico para acompanhamento de desempenho de vendedores, com dados de contas a receber/recebidas de 2025. Público-alvo: gestores comerciais. Necessita de clareza, hierarquia de informação e capacidade de drill-down por vendedor.

---

<response>
<idea>

### Ideia 1: "Corporate Analytics" — Swiss Design Industrial

**Design Movement**: Swiss International Style aplicado a dashboards corporativos industriais. Inspirado em painéis de controle de fábricas e relatórios financeiros europeus.

**Core Principles**:
1. Grid rígido com alinhamento matemático preciso
2. Tipografia como elemento principal de hierarquia
3. Uso de cor funcional (não decorativa) — cor indica status e urgência
4. Densidade informacional alta com legibilidade máxima

**Color Philosophy**: Fundo off-white quente (#F8F6F3) com texto em grafite escuro (#1A1A2E). Accent em azul-petróleo (#0F4C75) para elementos ativos e laranja queimado (#E85D04) para alertas e destaques negativos. Verde musgo (#2D6A4F) para indicadores positivos.

**Layout Paradigm**: Layout de grid assimétrico com sidebar fixa à esquerda contendo navegação e filtros. Área principal com cards em grid de 12 colunas, priorizando gráficos largos no topo e tabelas detalhadas abaixo.

**Signature Elements**:
1. Números grandes em fonte condensada como hero elements nos KPIs
2. Linhas divisórias finas e precisas separando seções
3. Micro-badges coloridos para status (pago, em atraso, a vencer)

**Interaction Philosophy**: Transições suaves e discretas. Hover revela detalhes adicionais. Clique filtra e foca. Sem animações chamativas.

**Animation**: Fade-in sequencial dos cards ao carregar. Números contam de 0 ao valor final. Gráficos desenham progressivamente da esquerda para direita.

**Typography System**: DM Sans para títulos (bold, condensed feel). Inter para corpo e dados tabulares. Monospace (JetBrains Mono) para valores financeiros.

</idea>
<probability>0.08</probability>
</response>

<response>
<idea>

### Ideia 2: "Dark Command Center" — Cyberpunk Dashboard

**Design Movement**: Inspirado em centros de comando e interfaces de monitoramento em tempo real. Estética dark mode com toques de neon.

**Core Principles**:
1. Fundo escuro para reduzir fadiga visual em uso prolongado
2. Hierarquia por luminosidade — elementos mais importantes são mais brilhantes
3. Dados em primeiro plano, decoração em segundo
4. Sensação de controle e domínio sobre a informação

**Color Philosophy**: Base em cinza muito escuro (#0B0B0F) com superfícies em (#161620). Accent primário em ciano elétrico (#00D4FF) para dados positivos e magenta (#FF006E) para alertas. Texto principal em branco suave (#E8E8ED).

**Layout Paradigm**: Full-screen sem sidebar. Top bar com filtros e navegação. Grid de cards flutuantes com bordas sutis e glow effects. Gráficos ocupam largura total.

**Signature Elements**:
1. Glow sutil nos cards ao hover
2. Gradientes de borda em elementos ativos
3. Sparklines inline nos KPIs

**Interaction Philosophy**: Responsivo e imediato. Hover com glow. Transições rápidas. Tooltips informativos.

**Animation**: Entrada com slide-up suave. Gráficos com morphing. Pulse sutil em dados atualizados.

**Typography System**: Space Grotesk para títulos. Inter para corpo. Tabular nums para valores.

</idea>
<probability>0.05</probability>
</response>

<response>
<idea>

### Ideia 3: "Warm Analytics" — Organic Business Intelligence

**Design Movement**: Design orgânico e acolhedor inspirado em dashboards modernos como Linear e Notion. Minimalismo quente com profundidade sutil.

**Core Principles**:
1. Warmth over coldness — tons quentes que humanizam os dados
2. Espaço generoso entre elementos para respiração visual
3. Hierarquia clara com poucos níveis de profundidade
4. Simplicidade que não sacrifica funcionalidade

**Color Philosophy**: Fundo em creme suave (#FAFAF8) com superfícies em branco puro. Texto em marrom escuro (#2C1810). Accent primário em terracota (#C45D3E) para ações e destaques. Secundário em verde-oliva (#5B7553) para positivos. Azul-acinzentado (#6B7B8D) para informações neutras.

**Layout Paradigm**: Layout vertical com seções empilhadas. Header fixo com filtros em dropdown. KPIs em row horizontal no topo. Gráficos em grid de 2 colunas. Tabela expansível na base.

**Signature Elements**:
1. Cantos arredondados generosos (12-16px) nos cards
2. Sombras suaves e quentes (não cinzas, mas levemente coloridas)
3. Ícones de linha fina com estilo hand-drawn

**Interaction Philosophy**: Suave e natural. Hover com elevação sutil. Filtros com transição de accordion. Feedback visual gentil.

**Animation**: Spring animations com framer-motion. Cards entram com stagger. Gráficos com ease-out natural.

**Typography System**: Instrument Serif para títulos grandes (elegância). DM Sans para corpo e labels. Monospace para valores.

</idea>
<probability>0.07</probability>
</response>

---

## Decisão

**Escolha: Ideia 1 — "Corporate Analytics" (Swiss Design Industrial)**

Razão: Para um dashboard de análise de vendedores de uma empresa de embalagens (UNIX PACK), a abordagem corporativa industrial é a mais adequada. Prioriza legibilidade, densidade informacional e profissionalismo. O grid rígido permite organizar muitos KPIs e gráficos sem confusão visual. As cores funcionais ajudam na rápida identificação de status (pago, atrasado, etc.).
