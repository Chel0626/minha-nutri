'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { usePacientes, usePreConfiguracoes } from '@/hooks/useDatabase';
import { Paciente, PreConfiguracao } from '@/types/database.types';
import { ChevronDown, Plus, Trash2, Check, GripVertical } from 'lucide-react';

interface ItemAlimento {
  id: string;
  nome: string;
  quantidade: string;
}

interface Opcao {
  id: string;
  itens: ItemAlimento[];
}

interface Refeicao {
  id: string;
  nome: string;
  metaCarboidratos: string;
  metaProteinas: string;
  opcoes: Opcao[];
  observacoes: string;
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

  const [metadados, setMetadados] = useState<MetadadosPrescricion>({
    pacienteId: '',
    pacienteNome: '',
    faseCaloricas: '',
    dataPrescricao: new Date().toISOString().split('T')[0],
  });

  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([
    {
      id: 'ref-1',
      nome: 'Café da Manhã',
      metaCarboidratos: '',
      metaProteinas: '',
      opcoes: [{ id: 'op-1', itens: [{ id: 'it-1', quantidade: '', nome: '' }] }],
      observacoes: '',
      expandido: false,
    },
  ]);

  const [tabelasSelecionadas, setTabelasSelecionadas] = useState({
    proteinas: false,
    substitutosArroz: false,
    frutas: false,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configsPorCategoria = preConfigs.reduce(
    (acc, config: PreConfiguracao) => {
      if (!acc[config.categoria]) acc[config.categoria] = [];
      acc[config.categoria].push(config);
      return acc;
    },
    {} as Record<string, PreConfiguracao[]>
  );

  // Handlers de Metadados
  const handlePacienteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pacienteId = e.target.value;
    const paciente = pacientes.find((p) => p.id === pacienteId);
    setMetadados({ ...metadados, pacienteId, pacienteNome: paciente?.nome_completo || '' });
  };

  const handleFaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMetadados({ ...metadados, faseCaloricas: e.target.value });
  };

  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMetadados({ ...metadados, dataPrescricao: e.target.value });
  };

  // Handlers de Refeição
  const adicionarRefeicao = () => {
    setRefeicoes([
      ...refeicoes,
      {
        id: `ref-${Date.now()}`,
        nome: '',
        metaCarboidratos: '',
        metaProteinas: '',
        opcoes: [{ id: `op-${Date.now()}`, itens: [{ id: `it-${Date.now()}`, quantidade: '', nome: '' }] }],
        observacoes: '',
        expandido: false,
      },
    ]);
  };

  const removerRefeicao = (id: string) => {
    setRefeicoes(refeicoes.filter((r) => r.id !== id));
  };

  const atualizarRefeicao = (id: string, campo: keyof Refeicao, valor: string | boolean) => {
    setRefeicoes(refeicoes.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));
  };

  // Handlers de Opções
  const adicionarOpcao = (refeicaoId: string) => {
    setRefeicoes(
      refeicoes.map((r) => {
        if (r.id === refeicaoId) {
          return {
            ...r,
            opcoes: [...r.opcoes, { id: `op-${Date.now()}`, itens: [{ id: `it-${Date.now()}`, quantidade: '', nome: '' }] }],
          };
        }
        return r;
      })
    );
  };

  const removerOpcao = (refeicaoId: string, opcaoId: string) => {
    setRefeicoes(
      refeicoes.map((r) => {
        if (r.id === refeicaoId) {
          return { ...r, opcoes: r.opcoes.filter((o) => o.id !== opcaoId) };
        }
        return r;
      })
    );
  };

  // Handlers de Itens (Alimento + Quantidade)
  const adicionarItem = (refeicaoId: string, opcaoId: string) => {
    setRefeicoes(
      refeicoes.map((r) => {
        if (r.id === refeicaoId) {
          return {
            ...r,
            opcoes: r.opcoes.map((o) => {
              if (o.id === opcaoId) {
                return { ...o, itens: [...o.itens, { id: `it-${Date.now()}`, quantidade: '', nome: '' }] };
              }
              return o;
            }),
          };
        }
        return r;
      })
    );
  };

  const removerItem = (refeicaoId: string, opcaoId: string, itemId: string) => {
    setRefeicoes(
      refeicoes.map((r) => {
        if (r.id === refeicaoId) {
          return {
            ...r,
            opcoes: r.opcoes.map((o) => {
              if (o.id === opcaoId) {
                return { ...o, itens: o.itens.filter((i) => i.id !== itemId) };
              }
              return o;
            }),
          };
        }
        return r;
      })
    );
  };

  const atualizarItem = (
    refeicaoId: string,
    opcaoId: string,
    itemId: string,
    campo: 'quantidade' | 'nome',
    valor: string
  ) => {
    setRefeicoes(
      refeicoes.map((r) => {
        if (r.id === refeicaoId) {
          return {
            ...r,
            opcoes: r.opcoes.map((o) => {
              if (o.id === opcaoId) {
                return {
                  ...o,
                  itens: o.itens.map((i) => {
                    if (i.id === itemId) return { ...i, [campo]: valor };
                    return i;
                  }),
                };
              }
              return o;
            }),
          };
        }
        return r;
      })
    );
  };

  // Handlers de Condutas
  const toggleExpandido = (id: string) => {
    setRefeicoes(refeicoes.map((r) => (r.id === id ? { ...r, expandido: !r.expandido } : r)));
  };

  const toggleConduta = (refeicaoId: string, conteudo: string, checked: boolean) => {
    setRefeicoes(
      refeicoes.map((r) => {
        if (r.id === refeicaoId) {
          let novoTexto = r.observacoes || '';
          if (checked) {
            if (!novoTexto.includes(conteudo)) {
              novoTexto = novoTexto ? `${novoTexto}\n\n${conteudo}` : conteudo;
            }
          } else {
            novoTexto = novoTexto
              .replace(`\n\n${conteudo}`, '')
              .replace(`${conteudo}\n\n`, '')
              .replace(conteudo, '');
          }
          return { ...r, observacoes: novoTexto.trim() };
        }
        return r;
      })
    );
  };

  const toggleTabela = (tabela: 'proteinas' | 'substitutosArroz' | 'frutas') => {
    setTabelasSelecionadas({ ...tabelasSelecionadas, [tabela]: !tabelasSelecionadas[tabela] });
  };

  // Salvar prescrição
  const handleSalvarPrescricao = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!metadados.pacienteId) {
      setError('Por favor, selecione um paciente');
      return;
    }

    try {
      setLoading(true);

      let conteudoPrescricao = `PRESCRIÇÃO DIETÉTICA\n`;
      conteudoPrescricao += `Data: ${metadados.dataPrescricao}\n`;
      conteudoPrescricao += `Paciente: ${metadados.pacienteNome}\n`;
      conteudoPrescricao += `Prescrição Dietética: ${metadados.faseCaloricas}\n\n`;
      conteudoPrescricao += `${'='.repeat(60)}\n\n`;

      refeicoes.forEach((ref) => {
        conteudoPrescricao += `${ref.nome.toUpperCase()}\n`;

        if (ref.metaCarboidratos || ref.metaProteinas) {
          conteudoPrescricao += `META INSULINA: `;
          if (ref.metaCarboidratos) conteudoPrescricao += `até ${ref.metaCarboidratos}g de Carboidratos`;
          if (ref.metaCarboidratos && ref.metaProteinas) conteudoPrescricao += ` | `;
          if (ref.metaProteinas) conteudoPrescricao += `Proteína: ${ref.metaProteinas}g`;
          conteudoPrescricao += `\n`;
        }

        ref.opcoes.forEach((opcao, idx) => {
          const temItensPreenchidos = opcao.itens.some((i) => i.nome.trim() || i.quantidade.trim());

          if (temItensPreenchidos) {
            if (ref.opcoes.length > 1) {
              conteudoPrescricao += `\nOpção ${idx + 1}:\n`;
            } else {
              conteudoPrescricao += `\n`;
            }

            opcao.itens.forEach((item) => {
              if (item.nome.trim() || item.quantidade.trim()) {
                const textoQuantidade = item.quantidade.trim() ? `${item.quantidade.trim()} ` : '';
                conteudoPrescricao += `• ${textoQuantidade}${item.nome.trim()}\n`;
              }
            });
          }
        });

        if (ref.observacoes.trim()) {
          conteudoPrescricao += `\nObs: ${ref.observacoes}\n\n`;
        } else {
          conteudoPrescricao += `\n\n`;
        }
      });

      if (tabelasSelecionadas.proteinas)
        conteudoPrescricao += `${'='.repeat(60)}\nTABELA DE EQUIVALENTES - PROTEÍNAS\n${'='.repeat(60)}\n[Tabela de proteínas será inserida aqui]\n\n`;
      if (tabelasSelecionadas.substitutosArroz)
        conteudoPrescricao += `${'='.repeat(60)}\nTABELA DE EQUIVALENTES - SUBSTITUTOS DE ARROZ\n${'='.repeat(60)}\n[Tabela de substitutos será inserida aqui]\n\n`;
      if (tabelasSelecionadas.frutas)
        conteudoPrescricao += `${'='.repeat(60)}\nTABELA DE EQUIVALENTES - FRUTAS\n${'='.repeat(60)}\n[Tabela de frutas será inserida aqui]\n\n`;

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
      setMetadados({
        pacienteId: '',
        pacienteNome: '',
        faseCaloricas: '',
        dataPrescricao: new Date().toISOString().split('T')[0],
      });
      setRefeicoes([
        {
          id: 'ref-1',
          nome: 'Café da Manhã',
          metaCarboidratos: '',
          metaProteinas: '',
          opcoes: [{ id: 'op-1', itens: [{ id: 'it-1', quantidade: '', nome: '' }] }],
          observacoes: '',
          expandido: false,
        },
      ]);
      setTabelasSelecionadas({ proteinas: false, substitutosArroz: false, frutas: false });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar prescrição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Criar Prescrição</h1>
            <p className="text-slate-600 text-sm mt-1">Estruture a prescrição com opções e alimentos</p>
          </div>
          <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
            ← Voltar
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <form onSubmit={handleSalvarPrescricao} className="space-y-6">

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-700">
              <Check className="w-5 h-5" /> Prescrição salva com sucesso!
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              ✗ {error}
            </div>
          )}

          {/* METADADOS */}
          <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Cabeçalho (Metadados)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Paciente *</label>
                <select
                  value={metadados.pacienteId}
                  onChange={handlePacienteChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Selecione um paciente</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome_completo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Resumo Nutricional</label>
                <input
                  type="text"
                  value={metadados.faseCaloricas}
                  onChange={handleFaseChange}
                  placeholder="Ex: Aprox 1400kcal, 25% prot..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Data / Ajuste</label>
                <input
                  type="text"
                  value={metadados.dataPrescricao}
                  onChange={handleDataChange}
                  placeholder="Ex: 06/06 (ajuste calórico...)"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* REFEIÇÕES */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Refeições</h2>
              <button
                type="button"
                onClick={adicionarRefeicao}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
              >
                <Plus className="w-4 h-4" /> Adicionar Refeição
              </button>
            </div>

            {refeicoes.map((refeicao) => (
              <div key={refeicao.id} className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">

                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Horário / Refeição</label>
                    <input
                      type="text"
                      value={refeicao.nome}
                      onChange={(e) => atualizarRefeicao(refeicao.id, 'nome', e.target.value)}
                      placeholder="Ex: Café da Manhã e Lanche da Tarde"
                      className="px-4 py-2 border border-slate-300 rounded-lg w-full focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {refeicoes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerRefeicao(refeicao.id)}
                      className="ml-4 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Meta Carboidratos (g)</label>
                    <input
                      type="number"
                      value={refeicao.metaCarboidratos}
                      onChange={(e) => atualizarRefeicao(refeicao.id, 'metaCarboidratos', e.target.value)}
                      placeholder="Ex: 30"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Meta Proteínas (g)</label>
                    <input
                      type="number"
                      value={refeicao.metaProteinas}
                      onChange={(e) => atualizarRefeicao(refeicao.id, 'metaProteinas', e.target.value)}
                      placeholder="Ex: 18"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Bloco de Opções */}
                <div className="space-y-6 mb-8">
                  {refeicao.opcoes.map((opcao, idx) => (
                    <div key={opcao.id}>
                      {refeicao.opcoes.length > 1 && (
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-700">Opção {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removerOpcao(refeicao.id, opcao.id)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {opcao.itens.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 mb-2">
                          <div className="text-slate-300 cursor-move">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <input
                            type="text"
                            value={item.nome}
                            onChange={(e) => atualizarItem(refeicao.id, opcao.id, item.id, 'nome', e.target.value)}
                            placeholder="Alimento"
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 text-sm"
                          />
                          <input
                            type="text"
                            value={item.quantidade}
                            onChange={(e) => atualizarItem(refeicao.id, opcao.id, item.id, 'quantidade', e.target.value)}
                            placeholder="Qtd"
                            className="w-24 px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 text-sm"
                          />
                          <div className="flex items-center gap-2 px-3 text-[10px] text-slate-400 font-mono bg-slate-100 rounded-md py-2 border border-slate-200 w-36 select-none">
                            <span>C:--</span>
                            <span>P:--</span>
                            <span>L:--</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removerItem(refeicao.id, opcao.id, item.id)}
                            className="p-2 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => adicionarItem(refeicao.id, opcao.id)}
                          className="text-emerald-600 font-medium text-sm flex items-center gap-1 hover:text-emerald-700 bg-emerald-100/50 px-3 py-1.5 rounded-md transition"
                        >
                          <Plus className="w-4 h-4" /> Adicionar Alimento
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => adicionarOpcao(refeicao.id)}
                    className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-emerald-500 hover:text-emerald-600 font-medium transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Nova Opção
                  </button>
                </div>

                {/* Condutas */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Observações / Condutas da Refeição
                  </label>
                  <textarea
                    value={refeicao.observacoes}
                    onChange={(e) => atualizarRefeicao(refeicao.id, 'observacoes', e.target.value)}
                    placeholder="Orientações específicas..."
                    rows={2}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpandido(refeicao.id)}
                  className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg"
                >
                  <span className="font-medium text-slate-900">Condutas Padrão</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-600 transition-transform ${refeicao.expandido ? 'rotate-180' : ''}`}
                  />
                </button>

                {refeicao.expandido && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="space-y-4">
                      {Object.entries(configsPorCategoria).map(([categoria, configs]) => (
                        <div key={categoria}>
                          <h4 className="font-semibold text-slate-800 mb-2 text-sm">{categoria}</h4>
                          <div className="space-y-2 pl-2">
                            {configs.map((config) => (
                              <label
                                key={config.id}
                                className="flex items-start gap-3 cursor-pointer hover:bg-white p-2 rounded transition"
                              >
                                <input
                                  type="checkbox"
                                  checked={refeicao.observacoes.includes(config.conteudo)}
                                  onChange={(e) => toggleConduta(refeicao.id, config.conteudo, e.target.checked)}
                                  className="w-4 h-4 mt-1 text-emerald-600 border-slate-300 rounded"
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-900">{config.titulo}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* TABELAS */}
          <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Tabelas de Equivalentes</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={tabelasSelecionadas.proteinas}
                  onChange={() => toggleTabela('proteinas')}
                  className="w-5 h-5 text-emerald-600 rounded"
                />
                <span className="font-medium text-slate-900">Tabela 1: Proteínas</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={tabelasSelecionadas.substitutosArroz}
                  onChange={() => toggleTabela('substitutosArroz')}
                  className="w-5 h-5 text-emerald-600 rounded"
                />
                <span className="font-medium text-slate-900">Tabela 2: Substitutos de Arroz</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={tabelasSelecionadas.frutas}
                  onChange={() => toggleTabela('frutas')}
                  className="w-5 h-5 text-emerald-600 rounded"
                />
                <span className="font-medium text-slate-900">Tabela 3: Frutas</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <Link href="/" className="px-6 py-3 border border-slate-300 rounded-lg text-slate-900 font-medium">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:bg-slate-400"
            >
              {loading ? 'Salvando...' : 'Salvar Prescrição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}