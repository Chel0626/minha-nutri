'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase'; // Conexão direta com o banco!

interface Props {
  valorInicial: string;
  onSelect: (nome: string, macros: { cho: number, ptn: number, lip: number }, dbId?: string) => void;
}

export default function BuscaAlimento({ valorInicial, onSelect }: Props) {
  const [query, setQuery] = useState(valorInicial);
  const [resultados, setResultados] = useState<any[]>([]);
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialRender = useRef(true); 

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Busca Direta no Banco (Sem Cache, Sem API)
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (query.length > 2) {
        setLoading(true);
        setDebugError(null);
        
        try {
          // Faz a busca direta e instantânea no Supabase
          const { data, error } = await supabase
            .from('alimentos')
            .select('*')
            .ilike('nome_exibicao', `%${query}%`)
            .limit(50);

          if (error) {
            console.error("[Busca Direta] Erro do Supabase:", error);
            setDebugError(error.message);
            setResultados([]);
            setAberto(true);
            return;
          }

          setResultados(data || []);
          if (!isInitialRender.current) {
            setAberto(true);
          }
        } catch (error: any) {
          console.error("[Busca Direta] Erro Crítico:", error);
          setDebugError(error.message);
          setAberto(true);
        } finally {
          setLoading(false);
        }
      } else {
        setResultados([]);
        setAberto(false);
        setDebugError(null);
      }
      isInitialRender.current = false;
    }, 300);
    
    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <div className="relative flex-1" ref={containerRef}>
      <input
        type="text"
        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 text-[11pt] font-medium text-slate-800 placeholder-slate-400 outline-none transition-all"
        placeholder="Buscar alimento..."
        value={query}
        onChange={(e) => {
          isInitialRender.current = false;
          setQuery(e.target.value);
          onSelect(e.target.value, { cho: 0, ptn: 0, lip: 0 }, '');
        }}
        onFocus={() => {
          if (resultados.length > 0 || loading || debugError) setAberto(true);
        }}
      />
      
      {aberto && query.length > 2 && (
        <div className="absolute z-50 w-full bg-white border border-slate-200 mt-1 rounded-md shadow-xl max-h-64 overflow-y-auto">
          
          {debugError && (
            <div className="p-4 bg-red-50 text-red-700 text-xs font-mono break-words border-b border-red-200">
              <strong className="block mb-1 text-sm text-red-800">⚠️ Erro na Busca:</strong>
              {debugError}
            </div>
          )}

          {loading ? (
            <div className="px-4 py-4 text-sm text-slate-500 text-center animate-pulse">Buscando...</div>
          ) : resultados.length > 0 ? (
            resultados.map((alimento: any, index: number) => {
              const nomeFinal = alimento.nome_exibicao || 'Alimento sem nome';
              return (
                <div
                  key={alimento.id || index}
                  className="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                  onClick={() => {
                    setQuery(nomeFinal);
                    onSelect(
                      nomeFinal, 
                      { 
                        cho: Number(alimento.cho) || 0, 
                        ptn: Number(alimento.ptn) || 0, 
                        lip: Number(alimento.lip) || 0 
                      },
                      alimento.id
                    );
                    setAberto(false);
                  }}
                >
                  <div className="font-semibold text-slate-800 text-[11pt]">{nomeFinal}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 flex gap-3 items-center">
                    <span className="bg-blue-50 text-blue-600 px-1.5 rounded">C: {alimento.cho}g</span>
                    <span className="bg-red-50 text-red-500 px-1.5 rounded">P: {alimento.ptn}g</span>
                    <span className="bg-amber-50 text-amber-600 px-1.5 rounded">L: {alimento.lip}g</span>
                    {alimento.porcao_padrao && (
                      <span className="ml-auto text-emerald-600 font-semibold italic text-[9px] bg-emerald-50 px-2 rounded-full border border-emerald-100">
                        {alimento.porcao_padrao}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : !debugError ? (
            <div className="px-4 py-4 text-sm text-slate-500 text-center">Nenhum alimento encontrado.</div>
          ) : null}
        </div>
      )}
    </div>
  );
}