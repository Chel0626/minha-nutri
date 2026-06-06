# Blueprint de Arquitetura: Plataforma de Nutrição (MVP)

## 📌 Contexto do Projeto
Este sistema é uma plataforma de nutrição customizada e exclusiva para uso de uma nutricionista (Carolina). O objetivo principal é otimizar o tempo de atendimento em consultório, centralizar dados de pacientes, automatizar cálculos dietéticos complexos e gerar prescrições em PDF de forma ágil.

---

## 🛠️ Stack Tecnológica (Abordagem Híbrida)
* **Aplicação Principal (Monolito Front/Back):** Next.js (App Router, Node.js para API Routes)
* **Estilização:** Tailwind CSS (Interface limpa, minimalista e sem excessos visuais)
* **Banco de Dados & Autenticação:** Supabase (PostgreSQL)
* **Microsserviço de Inteligência/Cálculos (Fase Futura):** Python (FastAPI) hospedado separadamente.

---

## 🏗️ Arquitetura de Dados Atualizada (Tabelas do Supabase)

### 1. `pacientes` (Dados Cadastrais Fixos)
* `id` (uuid, PK, default: gen_random_uuid())
* `nome_completo` (text, NOT NULL)
* `data_nascimento` (date, NOT NULL)
* `cpf` (varchar(14), UNIQUE)
* `telefone` (varchar(20))
* `email` (text, UNIQUE) -- Adicionado para contato e futuro login
* `endereco_completo` (text)
* `created_at` (timestamptz, default: now())

### 2. `anamneses` (Histórico de Consultas e Atendimentos)
* `id` (uuid, PK, default: gen_random_uuid())
* `paciente_id` (uuid, FK -> pacientes.id, ON DELETE CASCADE)
* `data_atendimento` (timestamptz, default: now())
* `altura` (numeric(3,2))
* `peso_atual` (numeric(5,2)) -- Corresponde ao "Peso A"
* `peso_historico` (numeric(5,2)) -- Corresponde ao "Peso H"
* `peso_desejado` (numeric(5,2)) -- Corresponde ao "Peso D"
* `indicacao` (text)
* `sobre_o_paciente` (text)
* `exames_com_alteracao` (text)
* `objetivos` (text)
* `queixas` (text)
* `medicamentos_em_uso` (text)
* `suplementos_em_uso` (text)
* `atividade_fisica` (text)
* `recordatorio_alimentar` (text)
* `gostos` (text)
* `aversoes` (text)
* `conduta` (text)
* `created_at` (timestamptz, default: now())

### 3. `pre_configuracoes` (Orientações padronizadas)
* `id` (uuid, PK, default: gen_random_uuid())
* `categoria` (varchar(50), NOT NULL) -- Ex: 'Diabetes', 'Fibras', 'Geral'
* `titulo` (text, NOT NULL)           -- Ex: 'Orientações para Intestino Preso'
* `conteudo` (text, NOT NULL)         -- O bloco de texto que vai ser injetado no PDF
* `created_at` (timestamptz, default: now())

### 4. Fluxo da Tela de Prescrição Estruturada (`/app/prescricoes/nova/page.tsx`)
1. **Cabeçalho Fixo (Metadados):** Dados estáticos bem estilizados (Nome do Paciente, Data, Fase/Calorias, Meta Insulina Geral).
2. **Sessões Dinâmicas de Refeição:** Permite adicionar múltiplos blocos de refeição. Cada bloco contém:
   * Nome da Refeição (Ex: Café da Manhã) e Horário/Âncora (Ex: Pós-Treino).
   * Meta Insulina da Refeição (Campos numéricos para Carboidratos e Proteínas).
   * Área de texto para os alimentos daquela refeição.
   * **Botão Expansível (Condutas de Gaveta):** Ao clicar, abre um painel/modal com os blocos de texto da tabela `pre_configuracoes` filtrados ou listados com um Checkbox. Ao marcar, o texto é importado/injetado direto no campo de texto daquela refeição específica.
3. **Sessão de Tabelas de Equivalentes:** Checkboxes para selecionar quais tabelas padrão de substitutos injetar automaticamente no final do PDF (Tabela 1: Proteína Animal, Tabela 2: Substitutos de Arroz, Tabela 3: Frutas).
4. **Impressão/PDF:** Um botão de gerar PDF que renderiza um layout limpo, com linhas divisórias elegantes, cabeçalho clínico centralizado e quebra de página controlada para as tabelas de equivalentes e blocos de hipoglicemia.
---

## 🗺️ Mapa de Telas & Funcionalidades (Next.js)

### 1. Dashboard Inicial (`/app/page.tsx`)
Uma tela de boas-vindas limpa ("Bem-vinda de volta, Carolina!") com 4 botões de Ações Rápidas (Quick Actions):
* `[👤 Cadastrar Paciente]` -> Redireciona para `/pacientes/novo`
* `[📝 Nova Anamnese / Consulta]` -> Redireciona para `/anamneses/nova`
* `[🍽️ Criar Prescrição]` -> Redireciona para `/prescricoes/nova`
* `[⚙️ Pré-Configurações]` -> Redireciona para `/configuracoes` (Cadastro de orientações em bloco).

### 2. Tela de Cadastro de Paciente (`/app/pacientes/novo/page.tsx`)
* Formulário simples para salvar os dados da tabela `pacientes` no Supabase.

### 3. Tela de Anamnese (`/app/anamneses/nova/page.tsx`)
* Dropdown para selecionar o Paciente.
* Formulário completo com todos os campos clínicos e de rotina mapeados na tabela `anamneses`.
* A data do atendimento é gerada automaticamente pelo banco de dados.

### 4. Fluxo da Tela de Prescrição Manual (`/app/prescricoes/nova/page.tsx`)
1.  Selecionar o paciente via dropdown.
2.  Campo de texto livre (textarea grande ou editor simples) para digitar o cardápio (Ex: "Arroz 120g...").
3.  Lista de Checkboxes carregada dinamicamente da tabela `pre_configuracoes`. A nutricionista marca as orientações que deseja incluir (Ex: `[X] Diabetes`, `[X] Consumo de Fibras`).
4.  Botão **[Gerar PDF]**: Compila os dados básicos do paciente, o texto do cardápio e injeta os blocos de texto das orientações selecionadas em um layout limpo pronto para impressão.

---

## 📂 Estrutura de Pastas Sugerida (Next.js App Router)

```text
meu-projeto-nutricao/
├── ARCHITECTURE_BLUEPRINT.md  <- Este arquivo
├── app/
│   ├── layout.tsx             <- Layout global com Navbar simples
│   ├── page.tsx               <- Dashboard (Boas-vindas + Botões)
│   ├── pacientes/
│   │   └── novo/
│   │       └── page.tsx       <- Formulário de cadastro de pacientes (Tabela pacientes)
│   ├── anamneses/
│   │   └── nova/
│   │       └── page.tsx       <- Ficha de atendimento detalhada (Tabela anamneses)
│   ├── configuracoes/
│   │   └── page.tsx       <- Cadastro de blocos de texto (Diabetes, Fibras, etc)
│   └── prescricoes/
│       └── nova/
│           └── page.tsx       <- Montagem da dieta (Cardápio + Checkboxes + PDF)
├── components/                <- Componentes reutilizáveis (Botões, Inputs, Cards)
├── lib/
│   └── supabase.ts            <- Inicialização do cliente Supabase (.env.local)
└── types/
    └── database.types.ts      <- Tipagens do TypeScript para o banco