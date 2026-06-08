'use client'; // <--- Adicione esta linha bem aqui no topo!

import { useState, useEffect, useRef } from 'react';

interface Props {
  valorInicial: string;
  onSelect: (nome: string, macros: { cho: number, ptn: number, lip: number }) => void;
}

export default function BuscaAlimento({ valorInicial, onSelect }: Props) {
  const [query, setQuery] = useState(valorInicial);
  const [resultados, setResultados] = useState([]);
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce da busca
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (query.length > 2) {
        try {
          const res = await fetch(`https://taco-api-464t.onrender.com/buscar/${query}`);
          const data = await res.json();
          setResultados(data.resultados || []);
          setAberto(true);
        } catch (error) {
          console.error("Erro na busca:", error);
        }
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <div className="relative flex-1" ref={containerRef}>
      <input
        type="text"
        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 text-sm"
        placeholder="Buscar alimento..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setAberto(true)}
      />
      
      {aberto && resultados.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-slate-200 mt-1 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {resultados.map((alimento: any) => (
            <div
              key={alimento.id}
              className="px-3 py-2 hover:bg-emerald-50 cursor-pointer text-sm"
              onClick={() => {
                setQuery(alimento.nome_exibicao);
                onSelect(alimento.nome_exibicao, { cho: alimento.cho, ptn: alimento.ptn, lip: alimento.lip });
                setAberto(false);
              }}
            >
              {alimento.nome_exibicao}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}