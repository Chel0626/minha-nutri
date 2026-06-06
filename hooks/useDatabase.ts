'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Paciente } from '@/types/database.types';

// Hook customizado para buscar pacientes do Supabase
export function usePacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPacientes();
  }, []);

  const fetchPacientes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('pacientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;

      setPacientes(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar pacientes';
      setError(message);
      console.error('Erro ao buscar pacientes:', err);
    } finally {
      setLoading(false);
    }
  };

  return { pacientes, loading, error, refetch: fetchPacientes };
}

// Hook customizado para buscar pré-configurações
export function usePreConfiguracoes() {
  const [preConfigs, setPreConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPreConfiguracoes();
  }, []);

  const fetchPreConfiguracoes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('pre_configuracoes')
        .select('*')
        .order('categoria', { ascending: true });

      if (err) throw err;

      setPreConfigs(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar pré-configurações';
      setError(message);
      console.error('Erro ao buscar pré-configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  return { preConfigs, loading, error, refetch: fetchPreConfiguracoes };
}
