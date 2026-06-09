'use client';

import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import { Paciente, PreConfiguracao } from '@/types/database.types';

// ------------------------------------------------------------------
// FETCHERS (As funções que ensinam o SWR a ir buscar no Supabase)
// ------------------------------------------------------------------
const fetcherPacientes = async () => {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Paciente[];
};

const fetcherPreConfiguracoes = async () => {
  const { data, error } = await supabase
    .from('pre_configuracoes')
    .select('*')
    .order('categoria', { ascending: true });

  if (error) throw error;
  return data as PreConfiguracao[];
};

// ------------------------------------------------------------------
// HOOKS CUSTOMIZADOS COM SWR (Cache embutido)
// ------------------------------------------------------------------

// Hook customizado para buscar pacientes
export function usePacientes() {
  // O primeiro parâmetro 'cache_pacientes' é a "gaveta" onde o SWR guarda os dados
  const { data, error, isLoading, mutate } = useSWR<Paciente[]>('cache_pacientes', fetcherPacientes);

  return { 
    pacientes: data || [], 
    loading: isLoading, 
    error: error?.message || null, 
    refetch: mutate // O mutate forçará a atualização na hora, útil após salvar um novo paciente
  };
}

// Hook customizado para buscar pré-configurações
export function usePreConfiguracoes() {
  const { data, error, isLoading, mutate } = useSWR<PreConfiguracao[]>('cache_pre_configs', fetcherPreConfiguracoes);

  return { 
    preConfigs: data || [], 
    loading: isLoading, 
    error: error?.message || null, 
    refetch: mutate 
  };
}