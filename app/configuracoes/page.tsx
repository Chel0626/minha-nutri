'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Plus, Trash2, Pencil, X, Check } from 'lucide-react';

interface PreConfiguracao {
  id: string;
  categoria: string;
  titulo: string;
  conteudo: string;
}

export default function Configuracoes() {
  const [configs, setConfigs] = useState<PreConfiguracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados do Formulário
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    categoria: '',
    titulo: '',
    conteudo: ''
  });

  // Mensagens de Feedback
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pre_configuracoes')
        .select('*')
        .order('categoria')
        .order('titulo');

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    } finally {
      setLoading(false);
    }
  }

  // Agrupar condutas por categoria para exibir na lista
  const configsAgrupadas = configs.reduce((acc, config) => {
    if (!acc[config.categoria]) acc[config.categoria] = [];
    acc[config.categoria].push(config);
    return acc;
  }, {} as Record<string, PreConfiguracao[]>);

  // Extrair categorias únicas para sugerir no input
  const categoriasUnicas = Array.from(new Set(configs.map(c => c.categoria)));

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMensagem(null);

    try {
      if (editId) {
        // Atualizar existente
        const { error } = await supabase
          .from('pre_configuracoes')
          .update(formData)
          .eq('id', editId);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Conduta atualizada com sucesso!' });
      } else {
        // Criar nova
        const { error } = await supabase
          .from('pre_configuracoes')
          .insert([formData]);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Nova conduta salva com sucesso!' });
      }

      // Limpar formulário e recarregar lista
      setFormData({ categoria: '', titulo: '', conteudo: '' });
      setEditId(null);
      fetchConfigs();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar a conduta.' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMensagem(null), 3000);
    }
  };

  const handleEditar = (config: PreConfiguracao) => {
    setFormData({
      categoria: config.categoria,
      titulo: config.titulo,
      conteudo: config.conteudo
    });
    setEditId(config.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelarEdicao = () => {
    setFormData({ categoria: '', titulo: '', conteudo: '' });
    setEditId(null);
  };

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conduta? Ela não aparecerá mais nas novas prescrições.')) return;

    try {
      const { error } = await supabase
        .from('pre_configuracoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMensagem({ tipo: 'sucesso', texto: 'Conduta excluída com sucesso!' });
      fetchConfigs();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir a conduta.' });
    } finally {
      setTimeout(() => setMensagem(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-3 rounded-xl">
            <Settings className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Pré-Configurações</h1>
            <p className="text-slate-600 mt-1">Gerencie os blocos de texto e condutas padrão</p>
          </div>
        </div>

        {mensagem && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {mensagem.tipo === 'sucesso' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            {mensagem.texto}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* COLUNA ESQUERDA: Formulário */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              {editId ? <Pencil className="w-5 h-5 text-orange-500" /> : <Plus className="w-5 h-5 text-emerald-500" />}
              {editId ? 'Editar Conduta' : 'Nova Conduta'}
            </h2>

            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Categoria</label>
                <input
                  type="text"
                  required
                  list="categorias"
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                  placeholder="Ex: Diabetes, Fibras, Geral..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <datalist id="categorias">
                  {categoriasUnicas.map(cat => <option key={cat} value={cat} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Título / Nome Curto</label>
                <input
                  type="text"
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  placeholder="Ex: Manejo de Hipoglicemia"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Conteúdo Completo (Vai para o PDF)</label>
                <textarea
                  required
                  rows={6}
                  value={formData.conteudo}
                  onChange={(e) => setFormData({...formData, conteudo: e.target.value})}
                  placeholder="Digite o texto completo da orientação..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                {editId && (
                  <button
                    type="button"
                    onClick={handleCancelarEdicao}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition ${editId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-50`}
                >
                  {isSubmitting ? 'Salvando...' : (editId ? 'Atualizar' : 'Salvar')}
                </button>
              </div>
            </form>
          </div>

          {/* COLUNA DIREITA: Lista de Condutas */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
                Carregando condutas...
              </div>
            ) : Object.keys(configsAgrupadas).length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
                Nenhuma conduta cadastrada ainda. Use o formulário ao lado para começar.
              </div>
            ) : (
              Object.entries(configsAgrupadas).map(([categoria, lista]) => (
                <div key={categoria} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
                    <h3 className="font-bold text-slate-800 text-lg">{categoria}</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {lista.map(config => (
                      <div key={config.id} className="p-6 hover:bg-slate-50 transition">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900 mb-2">{config.titulo}</h4>
                            <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
                              {config.conteudo}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleEditar(config)}
                              className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleExcluir(config.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}