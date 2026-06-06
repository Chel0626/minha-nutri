'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { usePacientes, usePreConfiguracoes } from '@/hooks/useDatabase';
import { PrescricaoFormData } from '@/types/database.types';

export default function CriarPrescricao() {
  const { pacientes, loading: loadingPacientes } = usePacientes();
  const { preConfigs, loading: loadingConfigs } = usePreConfiguracoes();

  const [formData, setFormData] = useState<PrescricaoFormData>({
    paciente_id: '',
    cardapio_texto: '',
    orientacoes_selecionadas: [],
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle mudanças no input de paciente
  const handlePacienteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      paciente_id: e.target.value,
    });
  };

  // Handle mudanças no textarea de cardápio
  const handleCardapioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      cardapio_texto: e.target.value,
    });
  };

  // Handle mudanças nos checkboxes de orientações
  const handleOrientacaoChange = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      orientacoes_selecionadas: prev.orientacoes_selecionadas.includes(id)
        ? prev.orientacoes_selecionadas.filter((oid) => oid !== id)
        : [...prev.orientacoes_selecionadas, id],
    }));
  };

  // Salvar prescrição no Supabase
  const handleSavePrescricao = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações
    if (!formData.paciente_id) {
      setError('Por favor, selecione um paciente');
      return;
    }

    if (!formData.cardapio_texto.trim()) {
      setError('Por favor, preencha o cardápio');
      return;
    }

    try {
      setLoading(true);

      const { error: insertError } = await supabase.from('prescricoes').insert([
        {
          paciente_id: formData.paciente_id,
          cardapio_texto: formData.cardapio_texto,
          orientacoes_selecionadas: formData.orientacoes_selecionadas,
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) throw insertError;

      setSuccess(true);
      // Limpar formulário após sucesso
      setFormData({
        paciente_id: '',
        cardapio_texto: '',
        orientacoes_selecionadas: [],
      });

      // Esconder mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar prescrição';
      setError(message);
      console.error('Erro ao salvar prescrição:', err);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar pré-configurações por categoria
  const configsPorCategoria = preConfigs.reduce(
    (acc, config: any) => {
      if (!acc[config.categoria]) {
        acc[config.categoria] = [];
      }
      acc[config.categoria].push(config);
      return acc;
    },
    {} as Record<string, any[]>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Criar Prescrição
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                Selecione um paciente, monte o cardápio e escolha as orientações
              </p>
            </div>
            <Link
              href="/"
              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
            >
              ← Voltar
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSavePrescricao} className="space-y-6">
          {/* Alert de Sucesso */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
              ✓ Prescrição salva com sucesso!
            </div>
          )}

          {/* Alert de Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              ✗ {error}
            </div>
          )}

          {/* Section 1: Seleção de Paciente */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              1. Selecionar Paciente
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Paciente *
              </label>
              <select
                value={formData.paciente_id}
                onChange={handlePacienteChange}
                disabled={loadingPacientes}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingPacientes ? 'Carregando pacientes...' : 'Escolha um paciente'}
                </option>
                {pacientes.map((paciente) => (
                  <option key={paciente.id} value={paciente.id}>
                    {paciente.nome_completo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Cardápio */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              2. Cardápio
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Detalhes do Cardápio *
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Digite o cardápio com quantidades, horários e recomendações específicas para o paciente.
              </p>
              <textarea
                value={formData.cardapio_texto}
                onChange={handleCardapioChange}
                placeholder="Ex: Café da manhã: 2 ovos cozidos + pão integral 50g + suco de laranja natural..."
                rows={8}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Section 3: Orientações */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              3. Orientações
            </h2>

            {loadingConfigs ? (
              <div className="text-center py-8 text-slate-600">
                Carregando orientações...
              </div>
            ) : Object.keys(configsPorCategoria).length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                <p>Nenhuma orientação cadastrada ainda.</p>
                <Link
                  href="/configuracoes"
                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Cadastre orientações aqui
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(configsPorCategoria).map(
                  ([categoria, configs]) => (
                    <div key={categoria}>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                        <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                        {categoria}
                      </h3>
                      <div className="space-y-3 ml-4">
                        {configs.map((config: any) => (
                          <div key={config.id} className="flex items-start">
                            <input
                              type="checkbox"
                              id={`orientacao-${config.id}`}
                              checked={formData.orientacoes_selecionadas.includes(
                                config.id
                              )}
                              onChange={() => handleOrientacaoChange(config.id)}
                              className="mt-1 w-4 h-4 accent-emerald-500 rounded border-slate-300 cursor-pointer"
                            />
                            <label
                              htmlFor={`orientacao-${config.id}`}
                              className="ml-3 cursor-pointer flex-1"
                            >
                              <div className="text-sm font-medium text-slate-900">
                                {config.titulo}
                              </div>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                {config.conteudo}
                              </p>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 justify-end">
            <Link
              href="/"
              className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? 'Salvando...' : '💾 Salvar Prescrição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
