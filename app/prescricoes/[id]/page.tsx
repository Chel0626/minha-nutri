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
    return <div className="p-8 text-center text-slate-500 font-medium mt-10">Carregando documento...</div>;
  }

  if (!prescricao) {
    return <div className="p-8 text-center text-red-500 font-medium mt-10">Prescrição não encontrada.</div>;
  }

  const handleImprimir = () => {
    window.print();
  };

  // Motor Inteligente: Converte o texto simples do Banco de Dados para o Layout Elegante do PDF
  const renderFormattedText = (texto: string) => {
    if (!texto) return null;
    const linhas = texto.split('\n');

    return linhas.map((linha, index) => {
      const trimmed = linha.trim();
      
      // Quebras de linha
      if (!trimmed) return <div key={index} className="h-3"></div>;

      // Remoção de cabeçalhos antigos de texto (substituídos pelo layout visual novo)
      if (trimmed === 'PRESCRIÇÃO DIETÉTICA') return null;
      if (trimmed.startsWith('Data:')) return null;
      if (trimmed.startsWith('Paciente:')) return null;
      if (trimmed.includes('======')) return null;

      // Resumo Calorico
      if (trimmed.startsWith('Prescrição Dietética:')) {
        return (
          <p key={index} className="text-justify mb-8 leading-relaxed font-sans">
            <span className="font-bold text-[#1e3a8a]">Prescrição Dietética:</span> {trimmed.replace('Prescrição Dietética:', '')}
          </p>
        );
      }

      // Tabelas de Equivalentes
      if (trimmed.startsWith('TABELA DE EQUIVALENTES - PROTEÍNAS')) return <h3 key={index} className="font-bold text-[#1e3a8a] text-[12pt] mt-8 mb-2">Tabela 1: Proteína Animal</h3>;
      if (trimmed.startsWith('TABELA DE EQUIVALENTES - SUBSTITUTOS DE ARROZ')) return <h3 key={index} className="font-bold text-[#1e3a8a] text-[12pt] mt-8 mb-2">Tabela 2: Substitutos de Arroz</h3>;
      if (trimmed.startsWith('TABELA DE EQUIVALENTES - FRUTAS')) return <h3 key={index} className="font-bold text-[#1e3a8a] text-[12pt] mt-8 mb-2">Tabela 3: Frutas</h3>;
      if (trimmed.startsWith('[Tabela')) {
        return <p key={index} className="italic text-slate-500 text-[10pt] mb-6">- As tabelas matemáticas automáticas só são geradas visualmente na hora da criação do documento -</p>;
      }

      // Metas de Insulina
      if (trimmed.startsWith('META INSULINA:')) {
        const partes = trimmed.split('|');
        return (
          <p key={index} className="text-xs font-bold uppercase tracking-wide mb-4">
            <span className="text-[#1e3a8a]">{partes[0]}</span>
            {partes[1] && <><span className="text-black mx-1">|</span><span className="text-[#b45309]">{partes[1]}</span></>}
          </p>
        );
      }

      // Títulos de Opções
      if (trimmed.startsWith('Opção')) {
        return <p key={index} className="font-bold text-[#b45309] mt-6 mb-2 text-[11pt]">{trimmed}</p>;
      }

      // Itens de Alimentos (Tenta identificar a gramatura para deixar em Negrito)
      if (trimmed.startsWith('•')) {
        const match = trimmed.match(/•\s([\d.,]+\s*(?:g|ml|colher|fatia|unidade|ovo|unid|porção)[s]?)\s+(.*)/i) || trimmed.match(/•\s([\d.,]+)\s+(.*)/);
        if (match) {
          return (
            <div key={index} className="ml-5 flex gap-2 text-[11pt] mb-1.5">
              <span className="text-black">•</span>
              <div><span className="font-bold">{match[1]}</span> {match[2]}</div>
            </div>
          );
        }
        return (
          <div key={index} className="ml-5 flex gap-2 text-[11pt] mb-1.5">
            <span className="text-black">•</span>
            <div>{trimmed.substring(1).trim()}</div>
          </div>
        );
      }

      // Observações (Itálico)
      if (trimmed.startsWith('Obs:')) {
        return <p key={index} className="italic text-[10pt] mt-3 text-gray-800 ml-5">{trimmed}</p>;
      }

      // Títulos das Refeições (Tudo Maiúsculo)
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && !trimmed.includes(':') && !trimmed.includes('•')) {
        return <h3 key={index} className="text-[14pt] font-bold text-[#1e3a8a] mt-10 mb-1">{trimmed}</h3>;
      }

      // Texto Comum
      return <p key={index} className="text-[11pt] mb-1">{trimmed}</p>;
    });
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
          <Printer className="w-5 h-5" /> Imprimir PDF
        </button>
      </div>

      {/* ========================================================================
        A FOLHA DE PAPEL (Visível na tela e perfeita na impressão)
        ========================================================================
      */}
      <div className="max-w-[210mm] mx-auto bg-white p-12 shadow-md border border-slate-200 rounded-lg print:shadow-none print:border-none print:m-0 print:p-12 text-black font-serif">
        
        {/* Cabeçalho */}
        <div className="border-b-2 border-[#1e3a8a] pb-2 mb-4 flex justify-between items-end">
          <div className="font-sans">
            <h1 className="text-3xl text-[#1e3a8a] mb-1 font-normal tracking-wide">Prescrição Dietética</h1>
            <h2 className="text-lg text-[#1e3a8a]">Paciente: {prescricao.pacientes?.nome_completo || 'Não informado'}</h2>
          </div>
        </div>

        {/* Info Nutricionista */}
        <div className="text-right text-[9pt] text-[#1e3a8a] flex flex-col items-end mb-8 font-sans leading-snug">
          <p className="text-black font-bold mb-1">Data: {new Date(prescricao.created_at).toLocaleDateString('pt-BR')}</p>
          <p className="font-bold">Nutricionista: Carolina Macedo CRN 29096</p>
          <p className="underline text-blue-700">carolinamacedo.nutri@gmail.com</p>
          <p className="underline text-blue-700">www.carolinaminhanutri.com</p>
          <p className="font-bold">(19) 98314-1909</p>
        </div>

        {/* Corpo do Documento Formatado */}
        <div className="font-sans break-inside-avoid">
          {renderFormattedText(prescricao.cardapio_texto)}
        </div>

      </div>
    </div>
  );
}