-- Migrações do Supabase para a Plataforma de Nutrição
-- Executar em ordem no editor SQL do Supabase

-- ============================================
-- 1. Tabela: pacientes
-- ============================================
CREATE TABLE pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  telefone VARCHAR(20),
  email TEXT UNIQUE,
  endereco_completo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX idx_pacientes_nome ON pacientes(nome_completo);
CREATE INDEX idx_pacientes_cpf ON pacientes(cpf);
CREATE INDEX idx_pacientes_email ON pacientes(email);

-- ============================================
-- 2. Tabela: anamneses
-- ============================================
CREATE TABLE anamneses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  data_atendimento TIMESTAMPTZ DEFAULT now(),
  altura NUMERIC(3,2),
  peso_atual NUMERIC(5,2),
  peso_historico NUMERIC(5,2),
  peso_desejado NUMERIC(5,2),
  indicacao TEXT,
  sobre_o_paciente TEXT,
  exames_com_alteracao TEXT,
  objetivos TEXT,
  queixas TEXT,
  medicamentos_em_uso TEXT,
  suplementos_em_uso TEXT,
  atividade_fisica TEXT,
  recordatorio_alimentar TEXT,
  gostos TEXT,
  aversoes TEXT,
  conduta TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_anamneses_paciente ON anamneses(paciente_id);
CREATE INDEX idx_anamneses_data ON anamneses(data_atendimento DESC);

-- ============================================
-- 3. Tabela: pre_configuracoes
-- ============================================
CREATE TABLE pre_configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria VARCHAR(50) NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_pre_config_categoria ON pre_configuracoes(categoria);

-- ============================================
-- 4. Tabela: prescricoes
-- ============================================
CREATE TABLE prescricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  anamnese_id UUID REFERENCES anamneses(id) ON DELETE SET NULL,
  cardapio_texto TEXT NOT NULL,
  orientacoes_selecionadas UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_prescricoes_paciente ON prescricoes(paciente_id);
CREATE INDEX idx_prescricoes_anamnese ON prescricoes(anamnese_id);
CREATE INDEX idx_prescricoes_data ON prescricoes(created_at DESC);

-- ============================================
-- Enable Row Level Security (RLS) - OPCIONAL
-- ============================================
-- Para implementação posterior com autenticação
-- ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE anamneses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pre_configuracoes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE prescricoes ENABLE ROW LEVEL SECURITY;
