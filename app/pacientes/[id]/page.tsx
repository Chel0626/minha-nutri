'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  User, Phone, Mail, Calendar as CalendarIcon, MapPin, 
  FileText, ClipboardList, Plus, ArrowLeft 
} from 'lucide-react';

export default function PerfilPaciente() {
  const params = useParams();
  const id = params.id as string;

  const [paciente, setPaciente] = useState<any>(null);
  const [anamneses, setAnamneses] = useState<any[]>([]);
  const [prescricoes, setPrescricoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDadosPaciente() {
      if (!id) return;

      try {
        setLoading(true);
        // Busca os dados em paralelo para ser mais rápido
        const [resPaciente, resAnamneses, resPrescricoes] = await Promise.all([
          supabase.from('pacientes').select('*').eq('id', id).single(),
          supabase.from('anamneses').select('*').eq('paciente_id', id).order('data_atendimento', { ascending: false }),
          supabase.from('prescricoes').select('*').eq('paciente_id', id).order('created_at', { ascending: false })
        ]);

        if (resPaciente.error) throw resPaciente.error;

        setPaciente(resPaciente.data);
        setAnamneses(resAnamneses.data || []);
        setPrescricoes(resPrescricoes.data || []);
      } catch (error) {
        console.error('Erro ao buscar perfil do paciente:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDadosPaciente();
  }, [id]);

  const formatarData = (dataIso: string, considerarHora = false) => {
    if (!dataIso) return 'N/A';
    const opcoes: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (considerarHora) {
      opcoes.hour = '2-digit';
      opcoes.minute = '2-digit';
    }
    return new Intl.DateTimeFormat('pt-BR', opcoes).format(new Date(dataIso));
  };

  if (loading) {
    return <div className="min-h-screen p-8 text-center text-slate-500">Carregando prontuário...</div>;
  }

  if (!paciente) {
    return <div className="min-h-screen p-8 text-center text-red-500">Paciente não encontrado.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header e Voltar */}
        <div className="flex items-center gap-4">
          <Link href="/pacientes" className="text-slate-500 hover:text-emerald-600 transition-colors p-2 bg-white rounded-full border border-slate-200 shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{paciente.nome_completo}</h1>
            <p className="text-slate-600">Prontuário Completo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA ESQUERDA: Dados Cadastrais */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="font-bold text-lg text-slate-900 mb-4 border-b border-slate-100 pb-2">Dados Pessoais</h2>
              <div className="space-y-4 text-sm text-slate-700">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <span><strong>Nascimento:</strong> {formatarData(paciente.data_nascimento)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <span><strong>CPF:</strong> {paciente.cpf || 'Não informado'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span><strong>Telefone:</strong> {paciente.telefone || 'Não informado'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span><strong>E-mail:</strong> {paciente.email || 'Não informado'}</span>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <span><strong>Endereço:</strong> {paciente.endereco_completo || 'Não informado'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: Histórico (Anamneses e Prescrições) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Bloco de Anamneses */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-500" /> Histórico de Consultas
                </h2>
                <Link 
                  href={`/anamneses/nova?pacienteId=${paciente.id}`}
                  className="flex items-center gap-1 text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-md font-medium transition"
                >
                  <Plus className="w-4 h-4" /> Nova
                </Link>
              </div>

              {anamneses.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Nenhuma anamnese registrada.</p>
              ) : (
                <div className="space-y-3">
                  {anamneses.map((anamnese) => (
                    <div key={anamnese.id} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">Consulta de {formatarData(anamnese.data_atendimento)}</p>
                        <p className="text-xs text-slate-500 mt-1">Peso: {anamnese.peso_atual ? `${anamnese.peso_atual} kg` : 'N/A'}</p>
                      </div>
                      <button className="text-indigo-600 text-sm font-medium hover:underline">Ver ficha</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bloco de Prescrições */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-500" /> Prescrições (Dietas)
                </h2>
                <Link 
                  href={`/prescricoes/nova?pacienteId=${paciente.id}`}
                  className="flex items-center gap-1 text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-md font-medium transition"
                >
                  <Plus className="w-4 h-4" /> Nova
                </Link>
              </div>

              {prescricoes.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Nenhuma prescrição gerada.</p>
              ) : (
                <div className="space-y-3">
                  {prescricoes.map((prescricao) => (
                    <div key={prescricao.id} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">Dieta gerada em {formatarData(prescricao.created_at, true)}</p>
                      </div>
                      <button className="text-emerald-600 text-sm font-medium hover:underline">Ver / Imprimir</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}