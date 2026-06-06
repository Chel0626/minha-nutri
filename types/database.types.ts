// Tipos baseados no schema do banco de dados Supabase (conforme ARCHITECTURE_BLUEPRINT.md)

export interface Paciente {
  id: string; // UUID
  nome_completo: string;
  data_nascimento: string; // ISO date (YYYY-MM-DD)
  cpf?: string; // varchar(14), UNIQUE
  telefone?: string; // varchar(20)
  email?: string; // text, UNIQUE
  endereco_completo?: string;
  created_at: string; // Timestamptz
}

export interface Anamnese {
  id: string; // UUID
  paciente_id: string; // FK -> pacientes.id
  data_atendimento: string; // Timestamptz
  altura?: number; // numeric(3,2)
  peso_atual?: number; // numeric(5,2)
  peso_historico?: number; // numeric(5,2)
  peso_desejado?: number; // numeric(5,2)
  indicacao?: string;
  sobre_o_paciente?: string;
  exames_com_alteracao?: string;
  objetivos?: string;
  queixas?: string;
  medicamentos_em_uso?: string;
  suplementos_em_uso?: string;
  atividade_fisica?: string;
  recordatorio_alimentar?: string;
  gostos?: string;
  aversoes?: string;
  conduta?: string;
  created_at: string; // Timestamptz
}

export interface PreConfiguracao {
  id: string; // UUID
  categoria: string; // Ex: 'Diabetes', 'Fibras', 'Geral'
  titulo: string; // Ex: 'Orientações para Intestino Preso'
  conteudo: string; // O bloco de texto para injetar no PDF
  created_at: string; // Timestamptz
}

export interface Prescricao {
  id: string; // UUID
  paciente_id: string; // FK -> pacientes.id
  anamnese_id?: string; // FK -> anamneses.id
  cardapio_texto: string; // Conteúdo digitado manualmente (Fase 1)
  orientacoes_selecionadas: string[]; // Array de UUIDs da tabela pre_configuracoes
  created_at: string; // Timestamptz
}

// Tipos para formulários
export interface PacienteFormData {
  nome_completo: string;
  data_nascimento: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  endereco_completo?: string;
}

export interface AnamneseFormData {
  paciente_id: string;
  altura?: number;
  peso_atual?: number;
  peso_historico?: number;
  peso_desejado?: number;
  indicacao?: string;
  sobre_o_paciente?: string;
  exames_com_alteracao?: string;
  objetivos?: string;
  queixas?: string;
  medicamentos_em_uso?: string;
  suplementos_em_uso?: string;
  atividade_fisica?: string;
  recordatorio_alimentar?: string;
  gostos?: string;
  aversoes?: string;
  conduta?: string;
}

export interface PrescricaoFormData {
  paciente_id: string;
  anamnese_id?: string;
  cardapio_texto: string;
  orientacoes_selecionadas: string[];
}

export interface PreConfiguracaoFormData {
  categoria: string;
  titulo: string;
  conteudo: string;
}
