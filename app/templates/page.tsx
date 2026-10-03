'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components';
import { LayoutTemplate, Plus, Pencil, Trash2, Loader2, Calendar } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('templates_prescricao')
      .select('*')
      .order('nome');
    
    if (!error && data) setTemplates(data);
    setLoading(false);
  };

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja apagar este template?')) return;
    await supabase.from('templates_prescricao').delete().eq('id', id);
    fetchTemplates();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader 
        title="Meus Templates de Dieta" 
        description="Crie bases prontas para acelerar a montagem das prescrições."
      />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex justify-end mb-6">
          <Link 
            href="/prescricoes/nova?isTemplate=true" 
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition shadow-sm"
          >
            <Plus className="w-5 h-5" /> Criar Novo Template do Zero
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">Nenhum template salvo</h3>
            <p className="text-slate-500 mb-6">Você pode criar um do zero ou salvar uma prescrição existente como template.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <div key={tpl.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition group">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <LayoutTemplate className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/prescricoes/nova?templateId=${tpl.id}`} className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-lg transition" title="Editar Template">
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button onClick={() => handleExcluir(tpl.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg transition" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-2">{tpl.nome}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 font-medium mt-4">
                  <Calendar className="w-3.5 h-3.5" /> Criado em {new Date(tpl.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}