'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, Printer, Calendar } from 'lucide-react';

interface PrescricaoHistorico {
  id: string;
  created_at: string;
  pacientes: {
    nome_completo: string;
  };
}

export default function HistoricoPrescricoes() {
  const [prescricoes, setPrescricoes] = useState<PrescricaoHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrescricoes() {
      try {
        // Faz o JOIN entre a tabela prescricoes e a tabela pacientes para pegar o nome
        const { data, error } = await supabase
          .from('prescricoes')
          .select(`
            id,
            created_at,
            pacientes (
              nome_completo
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPrescricoes(data as any || []);
      } catch (error) {
        console.error('Erro ao buscar histórico:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPrescricoes();
  }, []);

  // Formata a data para o padrão brasileiro
  const formatarData = (dataIso: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dataIso));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Histórico de Prescrições</h1>
            <p className="text-slate-600 mt-1">Visualize todas as dietas geradas</p>
          </div>
          <Link
            href="/prescricoes/nova"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Criar Prescrição
          </Link>
        </div>

        {/* Lista de Prescrições (Tabela) */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Carregando histórico...</div>
          ) : prescricoes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-4">Nenhuma prescrição foi criada ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                    <th className="p-4 font-semibold">Data da Consulta</th>
                    <th className="p-4 font-semibold">Paciente</th>
                    <th className="p-4 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {prescricoes.map((prescricao) => (
                    <tr key={prescricao.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 flex items-center gap-2 text-slate-700">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatarData(prescricao.created_at)}
                      </td>
                      <td className="p-4 font-medium text-slate-900">
                        {prescricao.pacientes?.nome_completo || 'Paciente não encontrado'}
                      </td>
                      <td className="p-4 text-right">
                        {/* Botão corrigido usando Link para a tela de impressão */}
                        <Link
                          href={`/prescricoes/${prescricao.id}`}
                          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-800 font-medium bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md transition"
                        >
                          <Printer className="w-4 h-4" />
                          Ver / Imprimir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}