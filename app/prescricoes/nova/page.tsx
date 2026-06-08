'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { usePacientes, usePreConfiguracoes } from '@/hooks/useDatabase';
import { Paciente, PreConfiguracao } from '@/types/database.types';
import { ChevronDown, Plus, Trash2, Check, GripVertical, Target, Printer } from 'lucide-react';
import BuscaAlimento from '@/components/BuscaAlimento';

const TACO_API_URL = "https://taco-api-464t.onrender.com";

interface ItemAlimento {
  id: string;
  nome: string;
  quantidade: string;
  baseMacros?: { cho: number; ptn: number; lip: number };
  macroAtivo?: 'cho' | 'ptn' | 'lip' | null;
  macroAlvo?: string;
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

const parseQtd = (str: string) => {
  if (!str) return 0;
  const match = str.match(/[\d.,]+/);
  return match ? parseFloat(match[0].replace(',', '.')) : 0;
};

const TABELA_PROTEINAS = [
  { nome: 'Frango (Peito, cozido)', base: 31.5 },
  { nome: 'Carne vermelha magra (Patinho, cozido)', base: 35.9 },
  { nome: 'Peixe (Pescada/Atum natural)', base: 26.6 },
  { nome: 'Lombo suíno (assado)', base: 35.7 },
];

const TABELA_ARROZ = [
  { nome: 'Batata Doce (cozida)', base: 18.4 },
  { nome: 'Batata Inglesa / Purê', base: 11.9 },
  { nome: 'Cará (cozido)', base: 18.9 },
  { nome: 'Inhame (cozido)', base: 23.5 },
  { nome: 'Mandioca (cozida)', base: 30.1 },
  { nome: 'Mandioquinha (cozida)', base: 18.9 },
  { nome: 'Milho-verde (enlatado)', base: 17.1 },
];

const TABELA_FRUTAS = [
  { nome: 'Abacaxi', base: 12.3 },
  { nome: 'Banana Prata', base: 26.0 },
  { nome: 'Goiaba', base: 13.0 },
  { nome: 'Laranja', base: 8.9 },
  { nome: 'Mamão', base: 11.6 },
  { nome: 'Manga', base: 15.0 },
  { nome: 'Maçã', base: 15.2 },
  { nome: 'Melancia', base: 6.8 },
  { nome: 'Melão', base: 7.5 },
  { nome: 'Morango', base: 6.8 },
  { nome: 'Uva', base: 17.3 },
];

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

  const [alvosTabelas, setAlvosTabelas] = useState({
    proteinas: '',
    substitutosArroz: '',
    frutas: '',
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

  // --- Handlers de Metadados ---

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

  // --- Handlers de Refeição ---

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

  // --- Handlers de Opções ---

  const adicionarOpcao = (refeicaoId: string) => {
    setRefeicoes(
      refeicoes.map((r) => {
        if (r.id === refeicaoId) {
          return {
            ...r,
            opcoes: [
              ...r.opcoes,
              { id: `op-${Date.now()}`, itens: [{ id: `it-${Date.now()}`, quantidade: '', nome: '' }] },
            ],
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

  // --- Handlers de Itens ---

  const adicionarItem = (refeicaoId: string, opcaoId: string) => {
    setRefeicoes(
      refeicoes.map((r) => {
        if (r.id === refeicaoId) {
          return {
            ...r,
            opcoes: r.opcoes.map((o) => {
              if (o.id === opcaoId) {
                return {
                  ...o,
                  itens: [...o.itens, { id: `it-${Date.now()}`, quantidade: '', nome: '' }],
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
    campo: keyof ItemAlimento,
    valor: any
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

  // --- Handlers de Engenharia Reversa ---

  const toggleMacroAtivo = (
    refeicaoId: string,
    opcaoId: string,
    itemId: string,
    macro: 'cho' | 'ptn' | 'lip' | null
  ) => {
    setRefeicoes(
      refeicoes.map((r) =>
        r.id === refeicaoId
          ? {
              ...r,
              opcoes: r.opcoes.map((o) =>
                o.id === opcaoId
                  ? {
                      ...o,
                      itens: o.itens.map((i) =>
                        i.id === itemId ? { ...i, macroAtivo: macro, macroAlvo: '' } : i
                      ),
                    }
                  : o
              ),
            }
          : r
      )
    );
  };

  const atualizarAlvoMacro = (
    refeicaoId: string,
    opcaoId: string,
    itemId: string,
    valor: string
  ) => {
    setRefeicoes(
      refeicoes.map((r) => {
        if (r.id !== refeicaoId) return r;
        return {
          ...r,
          opcoes: r.opcoes.map((o) => {
            if (o.id !== opcaoId) return o;
            return {
              ...o,
              itens: o.itens.map((i) => {
                if (i.id !== itemId) return i;

                let newQtd = i.quantidade;
                if (i.macroAtivo && i.baseMacros && valor !== '') {
                  const target = parseFloat(valor);
                  const base = i.baseMacros[i.macroAtivo];
                  if (base > 0 && !isNaN(target)) {
                    const pesoExato = (target * 100) / base;
                    const pesoArredondado = Math.round(pesoExato / 5) * 5;
                    newQtd = `${pesoArredondado}g`;
                  } else if (base === 0) {
                    newQtd = '0g';
                  }
                }
                return { ...i, macroAlvo: valor, quantidade: newQtd };
              }),
            };
          }),
        };
      })
    );
  };

  // --- Handlers de Condutas ---

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

  const calcularPesoEquivalente = (alvo: string, baseMacro: number) => {
    const alvoNum = parseFloat(alvo);
    if (isNaN(alvoNum) || baseMacro === 0) return '--';
    const pesoExato = (alvoNum * 100) / baseMacro;
    return `${Math.round(pesoExato / 5) * 5}g`;
  };

  // --- Salvar no Supabase ---

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
          if (ref.metaCarboidratos)
            conteudoPrescricao += `até ${ref.metaCarboidratos}g de Carboidratos`;
          if (ref.metaCarboidratos && ref.metaProteinas)
            conteudoPrescricao += ` | `;
          if (ref.metaProteinas)
            conteudoPrescricao += `Proteína: ${ref.metaProteinas}g`;
          conteudoPrescricao += `\n`;
        }

        ref.opcoes.forEach((opcao, idx) => {
          const temItensPreenchidos = opcao.itens.some(
            (i) => i.nome.trim() || i.quantidade.trim()
          );

          if (temItensPreenchidos) {
            if (ref.opcoes.length > 1) {
              conteudoPrescricao += `\nOpção ${idx + 1}:\n`;
            } else {
              conteudoPrescricao += `\n`;
            }

            opcao.itens.forEach((item) => {
              if (item.nome.trim() || item.quantidade.trim()) {
                const textoQuantidade = item.quantidade.trim()
                  ? `${item.quantidade.trim()} `
                  : '';
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

      {/* Interface do Sistema (Escondida na Impressão) */}
      <div className="print:hidden">
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Criar Prescrição</h1>
              <p className="text-slate-600 text-sm mt-1">Estruture a prescrição com opções e alimentos</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
              >
                <Printer className="w-4 h-4" /> Imprimir PDF
              </button>
              <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
                ← Voltar
              </Link>
            </div>
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
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Resumo Nutricional
                  </label>
                  <input
                    type="text"
                    value={metadados.faseCaloricas}
                    onChange={handleFaseChange}
                    placeholder="Ex: Aprox 1400kcal, 25% prot..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Data / Ajuste
                  </label>
                  <input
                    type="text"
                    value={metadados.dataPrescricao}
                    onChange={handleDataChange}
                    placeholder="Ex: 06/06/2026 (ajuste...)"
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
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Horário / Refeição
                      </label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Meta Carboidratos (g)
                      </label>
                      <input
                        type="number"
                        value={refeicao.metaCarboidratos}
                        onChange={(e) =>
                          atualizarRefeicao(refeicao.id, 'metaCarboidratos', e.target.value)
                        }
                        placeholder="Ex: 30"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
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
                        placeholder="Ex: 18"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Totais Calculados por Opção */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-8">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Totais Calculados por Opção
                    </h4>
                    <div className="space-y-2">
                      {refeicao.opcoes.map((opcao, idx) => {
                        let tCho = 0, tPtn = 0, tLip = 0;
                        opcao.itens.forEach((it) => {
                          const qtdNum = parseQtd(it.quantidade);
                          if (it.baseMacros) {
                            tCho += (it.baseMacros.cho * qtdNum) / 100;
                            tPtn += (it.baseMacros.ptn * qtdNum) / 100;
                            tLip += (it.baseMacros.lip * qtdNum) / 100;
                          }
                        });

                        const estourouCho =
                          refeicao.metaCarboidratos && tCho > Number(refeicao.metaCarboidratos);
                        const estourouPtn =
                          refeicao.metaProteinas && tPtn > Number(refeicao.metaProteinas);

                        return (
                          <div
                            key={opcao.id}
                            className="flex gap-4 text-sm bg-white p-2 border border-slate-100 rounded"
                          >
                            <span className="font-semibold text-slate-700 w-20">
                              Opção {idx + 1}:
                            </span>
                            <span
                              className={`font-mono ${estourouCho ? 'text-red-600 font-bold' : 'text-slate-600'}`}
                            >
                              C: {tCho.toFixed(1)}g
                            </span>
                            <span
                              className={`font-mono ${estourouPtn ? 'text-red-600 font-bold' : 'text-slate-600'}`}
                            >
                              P: {tPtn.toFixed(1)}g
                            </span>
                            <span className="font-mono text-slate-600">L: {tLip.toFixed(1)}g</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bloco de Opções */}
                  <div className="space-y-6 mb-8">
                    {refeicao.opcoes.map((opcao, idx) => (
                      <div key={opcao.id}>
                        {refeicao.opcoes.length > 1 && (
                          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                            <span className="text-sm font-bold text-slate-700 uppercase">
                              Opção {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removerOpcao(refeicao.id, opcao.id)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {opcao.itens.map((item) => {
                          const qtdNum = parseQtd(item.quantidade);
                          const calcM = (base?: number) =>
                            base ? ((base * qtdNum) / 100).toFixed(1) : '--';

                          return (
                            <div
                              key={item.id}
                              className="flex flex-col gap-2 mb-4 bg-white border border-slate-100 p-2 rounded-lg shadow-sm"
                            >
                              <div className="flex items-center gap-2">
                                <div className="text-slate-300 cursor-move">
                                  <GripVertical className="w-5 h-5" />
                                </div>
                                <BuscaAlimento
                                  valorInicial={item.nome}
                                  onSelect={(nome, macros) => {
                                    setRefeicoes((prev) =>
                                      prev.map((r) =>
                                        r.id === refeicao.id
                                          ? {
                                              ...r,
                                              opcoes: r.opcoes.map((o) =>
                                                o.id === opcao.id
                                                  ? {
                                                      ...o,
                                                      itens: o.itens.map((i) =>
                                                        i.id === item.id
                                                          ? { ...i, nome, baseMacros: macros }
                                                          : i
                                                      ),
                                                    }
                                                  : o
                                              ),
                                            }
                                          : r
                                      )
                                    );
                                  }}
                                />
                                <input
                                  type="text"
                                  value={item.quantidade}
                                  onChange={(e) =>
                                    atualizarItem(
                                      refeicao.id,
                                      opcao.id,
                                      item.id,
                                      'quantidade',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Qtd (Ex: 100g)"
                                  className="w-28 px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => removerItem(refeicao.id, opcao.id, item.id)}
                                  className="p-2 text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Linha de Macros (Clicáveis) */}
                              <div className="flex items-center pl-8 gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleMacroAtivo(
                                        refeicao.id,
                                        opcao.id,
                                        item.id,
                                        item.macroAtivo === 'cho' ? null : 'cho'
                                      )
                                    }
                                    className={`px-2 py-1 text-[11px] font-mono border rounded transition-colors ${
                                      item.macroAtivo === 'cho'
                                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                    }`}
                                  >
                                    C: {calcM(item.baseMacros?.cho)}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleMacroAtivo(
                                        refeicao.id,
                                        opcao.id,
                                        item.id,
                                        item.macroAtivo === 'ptn' ? null : 'ptn'
                                      )
                                    }
                                    className={`px-2 py-1 text-[11px] font-mono border rounded transition-colors ${
                                      item.macroAtivo === 'ptn'
                                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                    }`}
                                  >
                                    P: {calcM(item.baseMacros?.ptn)}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleMacroAtivo(
                                        refeicao.id,
                                        opcao.id,
                                        item.id,
                                        item.macroAtivo === 'lip' ? null : 'lip'
                                      )
                                    }
                                    className={`px-2 py-1 text-[11px] font-mono border rounded transition-colors ${
                                      item.macroAtivo === 'lip'
                                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                    }`}
                                  >
                                    L: {calcM(item.baseMacros?.lip)}
                                  </button>
                                </div>

                                {/* Caixa de Alvo */}
                                {item.macroAtivo && (
                                  <div className="flex items-center gap-2 ml-2 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
                                    <Target className="w-3 h-3 text-emerald-600" />
                                    <span className="text-[11px] font-semibold text-emerald-800">
                                      Alvo {item.macroAtivo.toUpperCase()} (g):
                                    </span>
                                    <input
                                      type="number"
                                      value={item.macroAlvo || ''}
                                      onChange={(e) =>
                                        atualizarAlvoMacro(
                                          refeicao.id,
                                          opcao.id,
                                          item.id,
                                          e.target.value
                                        )
                                      }
                                      placeholder="Ex: 15"
                                      className="w-16 px-2 py-0.5 text-[11px] font-mono border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => adicionarItem(refeicao.id, opcao.id)}
                            className="text-emerald-600 font-medium text-sm flex items-center gap-1 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md transition"
                          >
                            <Plus className="w-4 h-4" /> Adicionar Alimento
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => adicionarOpcao(refeicao.id)}
                      className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-emerald-500 hover:text-emerald-600 font-medium transition flex items-center justify-center gap-2 mt-4"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Nova Opção
                    </button>
                  </div>

                  {/* Observações */}
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
                      className={`w-5 h-5 text-slate-600 transition-transform ${
                        refeicao.expandido ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {refeicao.expandido && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
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
                                    checked={refeicao.observacoes.includes(config.conteudo)}
                                    onChange={(e) =>
                                      toggleConduta(refeicao.id, config.conteudo, e.target.checked)
                                    }
                                    className="w-4 h-4 mt-1 text-emerald-600 border-slate-300 rounded"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-900">
                                      {config.titulo}
                                    </p>
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

            {/* TABELAS DE EQUIVALENTES */}
            <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                Tabelas de Equivalentes (Cálculo Automático)
              </h2>
              <div className="space-y-4">

                {/* Tabela Proteínas */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={tabelasSelecionadas.proteinas}
                      onChange={() => toggleTabela('proteinas')}
                      className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <span className="font-medium text-slate-900">Tabela 1: Proteínas Animais</span>
                  </label>
                  {tabelasSelecionadas.proteinas && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-amber-700">Alvo PTN (g):</span>
                      <input
                        type="number"
                        value={alvosTabelas.proteinas}
                        onChange={(e) =>
                          setAlvosTabelas({ ...alvosTabelas, proteinas: e.target.value })
                        }
                        placeholder="Ex: 20"
                        className="w-24 px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>

                {/* Tabela Arroz */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={tabelasSelecionadas.substitutosArroz}
                      onChange={() => toggleTabela('substitutosArroz')}
                      className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <span className="font-medium text-slate-900">Tabela 2: Substitutos de Arroz</span>
                  </label>
                  {tabelasSelecionadas.substitutosArroz && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-700">Alvo CHO (g):</span>
                      <input
                        type="number"
                        value={alvosTabelas.substitutosArroz}
                        onChange={(e) =>
                          setAlvosTabelas({ ...alvosTabelas, substitutosArroz: e.target.value })
                        }
                        placeholder="Ex: 30"
                        className="w-24 px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>

                {/* Tabela Frutas */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={tabelasSelecionadas.frutas}
                      onChange={() => toggleTabela('frutas')}
                      className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <span className="font-medium text-slate-900">Tabela 3: Frutas</span>
                  </label>
                  {tabelasSelecionadas.frutas && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-700">Alvo CHO (g):</span>
                      <input
                        type="number"
                        value={alvosTabelas.frutas}
                        onChange={(e) =>
                          setAlvosTabelas({ ...alvosTabelas, frutas: e.target.value })
                        }
                        placeholder="Ex: 15"
                        className="w-24 px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div className="flex gap-4 justify-end">
              <Link
                href="/"
                className="px-6 py-3 border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
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

      {/* Área de Impressão (PDF Layout) */}
      <div className="hidden print:block bg-white text-black font-serif max-w-[210mm] mx-auto p-12 text-[11pt]">

        {/* Cabeçalho */}
        <div className="border-b-2 border-[#1e3a8a] pb-2 mb-4 flex justify-between items-end">
          <div className="font-sans">
            <h1 className="text-3xl text-[#1e3a8a] mb-1 font-normal tracking-wide">
              Prescrição Dietética
            </h1>
            <h2 className="text-lg text-[#1e3a8a]">
              Paciente: {metadados.pacienteNome || 'Nome não preenchido'}
            </h2>
          </div>
        </div>

        {/* Info Nutricionista */}
        <div className="text-right text-[9pt] text-[#1e3a8a] flex flex-col items-end mb-8 font-sans leading-snug">
          <p className="text-black font-bold mb-1">Data: {metadados.dataPrescricao}</p>
          <p className="font-bold">Nutricionista: Carolina Macedo CRN 29096</p>
          <p className="underline text-blue-700">carolinamacedo.nutri@gmail.com</p>
          <p className="underline text-blue-700">www.carolinaminhanutri.com</p>
          <p className="font-bold">(19) 98314-1909</p>
        </div>

        {/* Resumo */}
        {metadados.faseCaloricas && (
          <p className="text-justify mb-10 leading-relaxed font-sans">
            <span className="font-bold text-[#1e3a8a]">Prescrição Dietética:</span>{' '}
            {metadados.faseCaloricas}
          </p>
        )}

        {/* Loop de Refeições */}
        <div className="space-y-10 font-sans">
          {refeicoes.map((ref) => {
            const temConteudo = ref.opcoes.some((op) =>
              op.itens.some((it) => it.nome || it.quantidade)
            );
            if (!temConteudo) return null;

            return (
              <div key={ref.id} className="break-inside-avoid">

                {/* Título e Meta */}
                <div className="mb-4">
                  <h3 className="text-[14pt] font-bold text-[#1e3a8a] mb-1">{ref.nome}</h3>
                  {(ref.metaCarboidratos || ref.metaProteinas) && (
                    <p className="text-xs font-bold uppercase tracking-wide">
                      <span className="text-[#1e3a8a]">META INSULINA: </span>
                      {ref.metaCarboidratos && (
                        <span className="text-[#1e3a8a]">
                          até {ref.metaCarboidratos}g de Carboidratos{' '}
                        </span>
                      )}
                      {ref.metaCarboidratos && ref.metaProteinas && (
                        <span className="text-black mx-1">|</span>
                      )}
                      {ref.metaProteinas && (
                        <span className="text-[#b45309]">Proteína: {ref.metaProteinas}g</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Opções */}
                {ref.opcoes.map((opcao, idx) => {
                  const temItemPreenchido = opcao.itens.some((i) => i.nome || i.quantidade);
                  if (!temItemPreenchido) return null;

                  return (
                    <div key={opcao.id} className="mb-6 pl-2">
                      {ref.opcoes.length > 1 && (
                        <p className="font-bold text-[#b45309] mb-3 text-sm">Opção {idx + 1}:</p>
                      )}
                      <ul className="list-disc pl-5 space-y-1.5 text-[11pt]">
                        {opcao.itens.map((item) => {
                          if (!item.nome && !item.quantidade) return null;
                          return (
                            <li key={item.id} className="pl-1">
                              {item.quantidade && (
                                <span className="font-bold">{item.quantidade} </span>
                              )}{' '}
                              {item.nome}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}

                {/* Observações da Refeição */}
                {ref.observacoes && (
                  <p className="italic text-[10pt] mt-3 whitespace-pre-line pl-6 text-gray-800">
                    Obs: {ref.observacoes}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Tabelas de Equivalentes */}
        {(tabelasSelecionadas.proteinas ||
          tabelasSelecionadas.substitutosArroz ||
          tabelasSelecionadas.frutas) && (
          <div className="mt-14 break-before-auto font-sans">

            {/* Tabela de Proteínas */}
            {tabelasSelecionadas.proteinas && alvosTabelas.proteinas && (
              <div className="mb-10 break-inside-avoid">
                <h3 className="font-bold text-[#1e3a8a] text-[12pt] mb-2">
                  Tabela 1: aprox. {alvosTabelas.proteinas}g de Proteína Animal (Peso Pronto)
                </h3>
                <table className="w-full border-collapse border border-black text-[10.5pt]">
                  <thead>
                    <tr>
                      <th className="border border-black text-left px-3 py-1.5 font-bold">
                        Opção de Proteína
                      </th>
                      <th className="border border-black text-left px-3 py-1.5 font-bold w-1/3">
                        Quantidade / Peso
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {TABELA_PROTEINAS.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-black px-3 py-1.5">{item.nome}</td>
                        <td className="border border-black px-3 py-1.5">
                          {calcularPesoEquivalente(alvosTabelas.proteinas, item.base)}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="border border-black px-3 py-1.5">Ovos</td>
                      <td className="border border-black px-3 py-1.5 italic">
                        Ajustar (1 ovo = ~6g ptn)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Tabela Substitutos de Arroz */}
            {tabelasSelecionadas.substitutosArroz && alvosTabelas.substitutosArroz && (
              <div className="mb-10 break-inside-avoid">
                <h3 className="font-bold text-[#1e3a8a] text-[12pt] mb-2">
                  Tabela 2: Substitutos de Arroz (porção do almoço aprox.{' '}
                  {alvosTabelas.substitutosArroz}g Carboidratos)
                </h3>
                <table className="w-full border-collapse border border-black text-[10.5pt]">
                  <thead>
                    <tr>
                      <th className="border border-black text-left px-3 py-1.5 font-bold">
                        Alimento
                      </th>
                      <th className="border border-black text-left px-3 py-1.5 font-bold w-1/3">
                        Quantidade Equivalente
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {TABELA_ARROZ.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-black px-3 py-1.5">{item.nome}</td>
                        <td className="border border-black px-3 py-1.5">
                          {calcularPesoEquivalente(alvosTabelas.substitutosArroz, item.base)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[10pt] mt-2 font-bold text-gray-800">
                  Feijão: as mesmas quantidades para ervilha, lentilha ou grão-de-bico (60g)
                </p>
              </div>
            )}

            {/* Tabela de Frutas */}
            {tabelasSelecionadas.frutas && alvosTabelas.frutas && (
              <div className="mb-10 break-inside-avoid">
                <h3 className="font-bold text-[#1e3a8a] text-[12pt] mb-2">
                  Tabela 3: Frutas (1 porção ≈ {alvosTabelas.frutas}g Carboidratos)
                </h3>
                <table className="w-full border-collapse border border-black text-[10.5pt]">
                  <thead>
                    <tr>
                      <th className="border border-black text-left px-3 py-1.5 font-bold">
                        Fruta
                      </th>
                      <th className="border border-black text-left px-3 py-1.5 font-bold w-1/3">
                        Peso / Quantidade
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {TABELA_FRUTAS.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-black px-3 py-1.5">{item.nome}</td>
                        <td className="border border-black px-3 py-1.5">
                          {calcularPesoEquivalente(alvosTabelas.frutas, item.base)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}