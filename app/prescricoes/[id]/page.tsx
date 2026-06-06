'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Printer, ArrowLeft } from 'lucide-react';

export default function VisualizarPrescricao() {
  const params = useParams();
  const id = params.id as string;

  const [prescricao, setPrescricao] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrescricao() {
      try {
        const { data, error } = await supabase
          .from('prescricoes')
          .select('*, pacientes(nome_completo)')
          .eq('id', id)
          .single();

        if (error) throw error;
        setPrescricao(data);
      } catch (error) {
        console.error('Erro ao buscar prescrição:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPrescricao();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Carregando documento...</div>;
  }

  if (!prescricao) {
    return <div className="p-8 text-center text-red-500">Prescrição não encontrada.</div>;
  }

  // Função que chama a impressão do navegador (Gera o PDF nativo)
  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:p-0 print:bg-white">
      
      {/* Barra de Ações Superior (Escondida na impressão) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link 
          href="/prescricoes" 
          className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 font-medium transition"
        >
          <ArrowLeft className="w-5 h-5" /> Voltar ao Histórico
        </Link>
        <button
          onClick={handleImprimir}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition"
        >
          <Printer className="w-5 h-5" /> Gerar PDF / Imprimir
        </button>
      </div>

      {/* A Folha de Papel (Visível na tela e na impressão) */}
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 shadow-md border border-slate-200 rounded-lg print:shadow-none print:border-none print:m-0 print:p-0">
        
        {/* Cabeçalho Clínico Fixo */}
        <div className="border-b-2 border-emerald-600 pb-6 mb-8">
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider text-center mb-6">
            Prescrição Dietética
          </h1>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
            <div>
              <p><span className="font-bold">Paciente:</span> {prescricao.pacientes?.nome_completo}</p>
              <p><span className="font-bold">Nutricionista:</span> Carolina Macedo</p>
            </div>
            <div className="text-right">
              <p><span className="font-bold">Data:</span> {new Date(prescricao.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>

        {/* Corpo do Documento (O texto que geramos no banco) */}
        <div className="prose max-w-none text-slate-800">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {prescricao.cardapio_texto}
          </pre>
        </div>

        {/* Assinatura no Rodapé do Papel */}
        <div className="mt-24 pt-8 text-center text-slate-500 text-sm">
          <p>_________________________________________________</p>
          <p className="mt-2 font-bold text-slate-800">Carolina de Souza Silva Macedo</p>
          <p>Nutricionista Clínica</p>
        </div>

      </div>
    </div>
  );
}