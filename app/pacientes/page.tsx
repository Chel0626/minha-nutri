'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Search, Plus, FileText, UserPlus } from 'lucide-react';

interface Paciente {
  id: string;
  nome_completo: string;
  telefone: string;
  email: string;
  data_nascimento: string;
}

export default function ListaPacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPacientes() {
      try {
        const { data, error } = await supabase
          .from('pacientes')
          .select('*')
          .order('nome_completo');
        
        if (error) throw error;
        setPacientes(data || []);
      } catch (error) {
        console.error('Erro ao buscar pacientes:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPacientes();
  }, []);

  // Filtra os pacientes na memória (rápido e não gasta consultas extras no banco)
  const pacientesFiltrados = pacientes.filter((p) =>
    p.nome_completo.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Pacientes</h1>
            <p className="text-slate-600 mt-1">Gerencie seus pacientes cadastrados</p>
          </div>
          <Link
            href="/pacientes/novo"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Novo Paciente
          </Link>
        </div>

        {/* Barra de Busca */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar paciente por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
          />
        </div>

        {/* Lista de Pacientes (Grid de Cards) */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">Carregando pacientes...</div>
        ) : pacientesFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <p className="text-slate-500 mb-4">Nenhum paciente encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pacientesFiltrados.map((paciente) => (
              <div key={paciente.id} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-bold text-lg text-slate-900 mb-1">{paciente.nome_completo}</h3>
                <div className="text-sm text-slate-600 space-y-1 mb-4">
                  <p>📱 {paciente.telefone || 'Sem telefone'}</p>
                  <p>✉️ {paciente.email || 'Sem e-mail'}</p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <Link
                    href={`/prescricoes/nova?pacienteId=${paciente.id}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Nova Prescrição
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}