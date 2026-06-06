'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { usePacientes, usePreConfiguracoes } from '@/hooks/useDatabase';
import { Paciente, PreConfiguracao } from '@/types/database.types';
import { ChevronDown, Plus, Trash2, Check } from 'lucide-react';

interface Refeicao {
  id: string;
  nome: string;
  horario: string;
  metaCarboidratos: string;
  metaProteinas: string;
  alimentos: string;
  expandido: boolean;
}

interface MetadadosPrescricion {
  pacienteId: string;
  pacienteNome: string;
  faseCaloricas: string;
  dataPrescricao: string;
}

export default function CriarPrescricao() {
  const { pacientes, loading: loadingPacientes } = usePacientes();
  const { preConfigs, loading: loadingConfigs } = usePreConfiguracoes();

  // Estado para metadados
  const [metadados, setMetadados] = useState<MetadadosPrescricion>({
    pacienteId: '',
    pacienteNome: '',
    faseCaloricas: '',
    dataPrescricao: new Date().toISOString().split('T')[0],
  });

  // Estado para refeições dinâmicas
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([
    {
      id: '1',
      nome: 'Café da Manhã',
      horario: '',
      metaCarboidratos: '',
      metaProteinas: '',
      alimentos: '',
      expandido: false,
    },
  ]);

  // Estado para tabelas de equivalentes
  const [tabelasSelecionadas, setTabelasSelecionadas] = useState({
    proteinas: false,
    substitutosArroz: false,
    frutas: false,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Agrupar pré-configurações por categoria
  const configsPorCategoria = preConfigs.reduce(
    (acc, config: PreConfiguracao) => {
      if (!acc[config.categoria]) {
        acc[config.categoria] = [];
      }
      acc[config.categoria].push(config);
      return acc;
    },
    {} as Record<string, PreConfiguracao[]>
  );

  // Handle mudança de paciente
  const handlePacienteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pacienteId = e.target.value;
    const paciente = pacientes.find((p) => p.id === pacienteId);
    setMetadados({
      ...metadados,
      pacienteId,
      pacienteNome: paciente?.nome_completo || '',
    });
  };

  // Handle mudança de fase/calorias
  const handleFaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMetadados({
      ...metadados,
      faseCaloricas: e.target.value,
    });
  };

  // Handle mudança de data
  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMetadados({
      ...metadados,
      dataPrescricao: e.target.value,
    });
  };

  // Adicionar nova refeição
  const adicionarRefeicao = () => {
    const novaRefeicao: Refeicao = {
      id: Date.now().toString(),
      nome: '',
      horario: '',
      metaCarboidratos: '',
      metaProteinas: '',
      alimentos: '',
      expandido: false,
    };
    setRefeicoes([...refeicoes, novaRefeicao]);
  };

  // Remover refeição
  const removerRefeicao = (id: string) => {
    setRefeicoes(refeicoes.filter((r) => r.id !== id));
  };

  // Atualizar refeição
  const atualizarRefeicao = (id: string, campo: keyof Refeicao, valor: string | boolean) => {
    setRefeicoes(
      refeicoes.map((r) => (r.id === id ? { ...r, [campo]: valor } : r))
    );
  };

  // Expandir/Colapsar accordion de condutas
  const toggleExpandido = (id: string) => {
    setRefeicoes(
      refeicoes.map((r) => (r.id === id ? { ...r, expandido: !r.expandido } : r))
    );
  };

  // Injetar conduta no textarea da refeição
  const injetarConduta = (refeicaoId: string, conteudo: string) => {
    setRefeicoes(
      refeicoes.map((r) => {
        if (r.id === refeicaoId) {
          return {
            ...r,
            alimentos: r.alimentos ? `${r.alimentos}\n\n${conteudo}` : conteudo,
          };
        }
        return r;
      })
    );
  };

  // Toggle tabela de equivalentes
  const toggleTabela = (tabela: 'proteinas' | 'substitutosArroz' | 'frutas') => {
    setTabelasSelecionadas({
      ...tabelasSelecionadas,
      [tabela]: !tabelasSelecionadas[tabela],
    });
  };

  // Salvar prescrição
  const handleSalvarPrescricao = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações
    if (!metadados.pacienteId) {
      setError('Por favor, selecione um paciente');
      return;
    }

    if (refeicoes.length === 0 || refeicoes.every((r) => !r.alimentos.trim())) {
      setError('Por favor, adicione pelo menos uma refeição com alimentos');
      return;
    }

    try {
      setLoading(true);

      // Preparar conteúdo da prescrição
      let conteudoPrescricao = `PRESCRIÇÃO NUTRICIONAL\n`;
      conteudoPrescricao += `Data: ${metadados.dataPrescricao}\n`;
      conteudoPrescricao += `Paciente: ${metadados.pacienteNome}\n`;
      conteudoPrescricao += `Fase/Calorias: ${metadados.faseCaloricas}\n\n`;
      conteudoPrescricao += `${'='.repeat(60)}\n\n`;

      // Adicionar refeições
      refeicoes.forEach((ref) => {
        conteudoPrescricao += `${ref.nome.toUpperCase()}\n`;
        if (ref.horario) conteudoPrescricao += `Horário: ${ref.horario}\n`;
        if (ref.metaCarboidratos)
          conteudoPrescricao += `Meta Carboidratos: ${ref.metaCarboidratos}g\n`;
        if (ref.metaProteinas)
          conteudoPrescricao += `Meta Proteínas: ${ref.metaProteinas}g\n`;
        conteudoPrescricao += `\n${ref.alimentos}\n\n`;
      });

      // Adicionar tabelas de equivalentes
      if (tabelasSelecionadas.proteinas) {
        conteudoPrescricao += `${'='.repeat(60)}\n`;
        conteudoPrescricao += `TABELA DE EQUIVALENTES - PROTEÍNAS\n`;
        conteudoPrescricao += `${'='.repeat(60)}\n`;
        conteudoPrescricao += `[Tabela de proteínas será inserida aqui]\n\n`;
      }

      if (tabelasSelecionadas.substitutosArroz) {
        conteudoPrescricao += `${'='.repeat(60)}\n`;
        conteudoPrescricao += `TABELA DE EQUIVALENTES - SUBSTITUTOS DE ARROZ\n`;
        conteudoPrescricao += `${'='.repeat(60)}\n`;
        conteudoPrescricao += `[Tabela de substitutos será inserida aqui]\n\n`;
      }

      if (tabelasSelecionadas.frutas) {
        conteudoPrescricao += `${'='.repeat(60)}\n`;
        conteudoPrescricao += `TABELA DE EQUIVALENTES - FRUTAS\n`;
        conteudoPrescricao += `${'='.repeat(60)}\n`;
        conteudoPrescricao += `[Tabela de frutas será inserida aqui]\n\n`;
      }

      // Salvar no Supabase
      const { error: insertError } = await supabase.from('prescricoes').insert([
        {
          paciente_id: metadados.pacienteId,
          cardapio_texto: conteudoPrescricao,
          orientacoes_selecionadas: [],
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) throw insertError;

      setSuccess(true);
      // Resetar formulário
      setMetadados({
        pacienteId: '',
        pacienteNome: '',
        faseCaloricas: '',
        dataPrescricao: new Date().toISOString().split('T')[0],
      });
      setRefeicoes([
        {
          id: '1',
          nome: 'Café da Manhã',
          horario: '',
          metaCarboidratos: '',
          metaProteinas: '',
          alimentos: '',
          expandido: false,
        },
      ]);
      setTabelasSelecionadas({
        proteinas: false,
        substitutosArroz: false,
        frutas: false,
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar prescrição';
      setError(message);
      console.error('Erro ao salvar prescrição:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Criar Prescrição</h1>
              <p className="text-slate-600 text-sm mt-1">
                Estruture a prescrição com refeições, metas e condutas
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
      <div className="max-w-6xl mx-auto px-6 py-8">
        <form onSubmit={handleSalvarPrescricao} className="space-y-6">
          {/* Alert de Sucesso */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-700">
              <Check className="w-5 h-5" />
              Prescrição salva com sucesso!
            </div>
          )}

          {/* Alert de Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              ✗ {error}
            </div>
          )}

          {/* SEÇÃO 1: METADADOS */}
          <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Metadados da Prescrição</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Paciente */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Paciente *
                </label>
                <select
                  value={metadados.pacienteId}
                  onChange={handlePacienteChange}
                  disabled={loadingPacientes}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingPacientes ? 'Carregando...' : 'Selecione um paciente'}
                  </option>
                  {pacientes.map((paciente) => (
                    <option key={paciente.id} value={paciente.id}>
                      {paciente.nome_completo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fase/Calorias */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Fase / Calorias
                </label>
                <input
                  type="text"
                  value={metadados.faseCaloricas}
                  onChange={handleFaseChange}
                  placeholder="Ex: Fase 1 - 1500 kcal"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Data */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Data</label>
                <input
                  type="date"
                  value={metadados.dataPrescricao}
                  onChange={handleDataChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: REFEIÇÕES */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Refeições</h2>
              <button
                type="button"
                onClick={adicionarRefeicao}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition"
              >
                <Plus className="w-4 h-4" /> Adicionar Refeição
              </button>
            </div>

            {refeicoes.map((refeicao, index) => (
              <div key={refeicao.id} className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                {/* Header da Refeição */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nome da Refeição
                    </label>
                    <input
                      type="text"
                      value={refeicao.nome}
                      onChange={(e) =>
                        atualizarRefeicao(refeicao.id, 'nome', e.target.value)
                      }
                      placeholder="Ex: Café da Manhã"
                      className="px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full"
                    />
                  </div>
                  {refeicoes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerRefeicao(refeicao.id)}
                      className="ml-4 text-red-600 hover:text-red-700 transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Metas e Horário */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Horário
                    </label>
                    <input
                      type="time"
                      value={refeicao.horario}
                      onChange={(e) =>
                        atualizarRefeicao(refeicao.id, 'horario', e.target.value)
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Meta Carboidratos (g)
                    </label>
                    <input
                      type="number"
                      value={refeicao.metaCarboidratos}
                      onChange={(e) =>
                        atualizarRefeicao(refeicao.id, 'metaCarboidratos', e.target.value)
                      }
                      placeholder="0"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Meta Proteínas (g)
                    </label>
                    <input
                      type="number"
                      value={refeicao.metaProteinas}
                      onChange={(e) =>
                        atualizarRefeicao(refeicao.id, 'metaProteinas', e.target.value)
                      }
                      placeholder="0"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Textarea de Alimentos */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Alimentos *
                  </label>
                  <textarea
                    value={refeicao.alimentos}
                    onChange={(e) =>
                      atualizarRefeicao(refeicao.id, 'alimentos', e.target.value)
                    }
                    placeholder="Digite os alimentos e quantidades..."
                    rows={5}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Accordion de Condutas */}
                <button
                  type="button"
                  onClick={() => toggleExpandido(refeicao.id)}
                  className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-300 px-4 py-3 rounded-lg transition"
                >
                  <span className="font-medium text-slate-900">Injetar Condutas/Orientações</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-600 transition-transform ${
                      refeicao.expandido ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Conteúdo do Accordion */}
                {refeicao.expandido && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    {Object.entries(configsPorCategoria).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(configsPorCategoria).map(([categoria, configs]) => (
                          <div key={categoria}>
                            <h4 className="font-semibold text-slate-800 mb-2 text-sm">
                              {categoria}
                            </h4>
                            <div className="space-y-2 pl-2">
                              {configs.map((config) => (
                                <label
                                  key={config.id}
                                  className="flex items-start gap-3 cursor-pointer hover:bg-white p-2 rounded transition"
                                >
                                  <input
                                    type="checkbox"
                                    onChange={() =>
                                      injetarConduta(refeicao.id, config.conteudo)
                                    }
                                    className="w-4 h-4 mt-1 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-900">
                                      {config.titulo}
                                    </p>
                                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                      {config.conteudo}
                                    </p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-600 text-sm">
                        Nenhuma conduta pré-configurada disponível
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* SEÇÃO 3: TABELAS DE EQUIVALENTES */}
          <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              Tabelas de Equivalentes (Para anexar ao PDF)
            </h2>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-slate-50 rounded-lg transition">
                <input
                  type="checkbox"
                  checked={tabelasSelecionadas.proteinas}
                  onChange={() => toggleTabela('proteinas')}
                  className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-900">Tabela 1: Proteínas Animal</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-slate-50 rounded-lg transition">
                <input
                  type="checkbox"
                  checked={tabelasSelecionadas.substitutosArroz}
                  onChange={() => toggleTabela('substitutosArroz')}
                  className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-900">Tabela 2: Substitutos de Arroz</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-slate-50 rounded-lg transition">
                <input
                  type="checkbox"
                  checked={tabelasSelecionadas.frutas}
                  onChange={() => toggleTabela('frutas')}
                  className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-900">Tabela 3: Frutas</span>
              </label>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-4 justify-end">
            <Link
              href="/"
              className="px-6 py-3 border border-slate-300 rounded-lg text-slate-900 font-medium hover:bg-slate-50 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar Prescrição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}