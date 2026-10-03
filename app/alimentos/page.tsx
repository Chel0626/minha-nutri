'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components';
import { Plus, Search, Pencil, Trash2, Loader2, X, Globe, Wand2 } from 'lucide-react';

export default function BancoDeAlimentosPage() {
  const [alimentos, setAlimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados do Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [buscandoWeb, setBuscandoWeb] = useState(false);
  const [resultadosWeb, setResultadosWeb] = useState<any[]>([]);

  // Formulário de Edição
  const [form, setForm] = useState({
    id: '', nome: '', cho: '', ptn: '', lip: '', porcao: '100g', pesoUnitario: '', medidasCustomizadas: [] as {nome: string, peso_g: number}[]
  });
  const [novaMedida, setNovaMedida] = useState({ nome: 'colher de sopa', macroRef: 'cho', valor: '' });

  useEffect(() => {
    fetchAlimentos();
  }, [searchTerm]);

  const fetchAlimentos = async () => {
    setLoading(true);
    let query = supabase.from('alimentos').select('*').order('nome_exibicao').limit(100);
    
    if (searchTerm.trim() !== '') {
      query = query.ilike('nome_exibicao', `%${searchTerm}%`);
    }

    const { data, error } = await query;
    if (!error && data) setAlimentos(data);
    setLoading(false);
  };

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este alimento permanentemente do banco de dados?')) return;
    try {
      await supabase.from('alimentos').delete().eq('id', id);
      fetchAlimentos();
    } catch (e) {
      alert("Erro ao excluir alimento.");
    }
  };

  const abrirModalNovo = () => {
    setForm({ id: '', nome: '', cho: '', ptn: '', lip: '', porcao: '100g', pesoUnitario: '', medidasCustomizadas: [] });
    setModalOpen(true);
    setResultadosWeb([]);
  };

  const abrirModalEditar = (alimento: any) => {
    setForm({
      id: alimento.id,
      nome: alimento.nome_exibicao || alimento.nome,
      cho: String(alimento.cho || 0),
      ptn: String(alimento.ptn || 0),
      lip: String(alimento.lip || 0),
      porcao: alimento.porcao_padrao || '100g',
      pesoUnitario: alimento.peso_unitario ? String(alimento.peso_unitario) : '',
      medidasCustomizadas: alimento.medidas_customizadas || []
    });
    setModalOpen(true);
    setResultadosWeb([]);
  };

  const handleBuscarNaWeb = async () => {
    if (!form.nome.trim()) { alert("Digite o nome do alimento antes de buscar na web."); return; }
    setBuscandoWeb(true);
    setResultadosWeb([]);
    try {
      const termo = encodeURIComponent(form.nome);
      const res = await fetch(`https://br.openfoodfacts.org/cgi/search.pl?search_terms=${termo}&search_simple=1&action=process&json=1`);
      const data = await res.json();
      if (data.products && data.products.length > 0) {
        const validProducts = data.products.filter((p: any) => p.nutriments && (p.product_name_pt || p.product_name));
        if (validProducts.length > 0) { setResultadosWeb(validProducts.slice(0, 8)); } 
        else { alert("Produtos encontrados, mas nenhum contém tabela nutricional cadastrada no Open Food Facts."); }
      } else { alert("Nenhum produto exato encontrado na base aberta. Tente um nome mais genérico."); }
    } catch(e) { alert("Erro ao conectar com a base mundial."); }
    setBuscandoWeb(false);
  };

  const selecionarProdutoWeb = (prod: any) => {
    const nomeProduto = prod.product_name_pt || prod.product_name;
    const marca = prod.brands ? ` - ${prod.brands.split(',')[0]}` : '';
    setForm(prev => ({
      ...prev,
      nome: `${nomeProduto}${marca}`,
      cho: String(prod.nutriments?.carbohydrates_100g || 0),
      ptn: String(prod.nutriments?.proteins_100g || 0),
      lip: String(prod.nutriments?.fat_100g || 0),
      porcao: '100g'
    }));
    setResultadosWeb([]);
  };

  const handleAddMedidaCustomizada = () => {
     const macroBaseG = parseFloat(form[novaMedida.macroRef as 'cho'|'ptn'|'lip']) || 0;
     const targetG = parseFloat(novaMedida.valor);
     if (macroBaseG <= 0 || isNaN(targetG) || targetG <= 0) { alert("Preencha os macros do alimento e o valor alvo da medida."); return; }
     
     let baseNum = 100;
     const matchNum = form.porcao.match(/[\d.,]+/);
     if (matchNum) baseNum = parseFloat(matchNum[0].replace(',', '.'));
     
     const pesoDaMedida = (targetG * baseNum) / macroBaseG;
     setForm(prev => ({ ...prev, medidasCustomizadas: [...prev.medidasCustomizadas, { nome: novaMedida.nome, peso_g: pesoDaMedida }] }));
     setNovaMedida({ ...novaMedida, valor: '' });
  };

  const handleRemoverMedidaCustomizada = (index: number) => {
     const novas = [...form.medidasCustomizadas]; novas.splice(index, 1);
     setForm(prev => ({ ...prev, medidasCustomizadas: novas }));
  };

  const handleSalvarAlimento = async () => {
    if (!form.nome.trim()) return alert("O nome não pode estar vazio.");
    setSalvando(true);
    try {
      const caloriasCalculadas = (parseFloat(form.cho) || 0) * 4 + (parseFloat(form.ptn) || 0) * 4 + (parseFloat(form.lip) || 0) * 9;
      const dados = {
        nome_exibicao: form.nome,
        cho: parseFloat(form.cho) || 0,
        ptn: parseFloat(form.ptn) || 0,
        lip: parseFloat(form.lip) || 0,
        kcal: caloriasCalculadas,
        porcao_padrao: form.porcao,
        peso_unitario: form.pesoUnitario ? parseFloat(form.pesoUnitario) : null,
        medidas_customizadas: form.medidasCustomizadas
      };

      if (form.id) {
        await supabase.from('alimentos').update(dados).eq('id', form.id);
      } else {
        await supabase.from('alimentos').insert([dados]);
      }
      setModalOpen(false);
      fetchAlimentos();
    } catch (e) {
      alert("Erro ao salvar alimento no banco.");
    }
    setSalvando(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader 
        title="Banco de Alimentos" 
        description="Gerencie a tabela nutricional do seu sistema de prescrição."
      />

      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Barra de Busca e Botão */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar alimento no banco..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none shadow-sm transition-all"
            />
          </div>
          <button 
            onClick={abrirModalNovo}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 font-bold transition shadow-sm"
          >
            <Plus className="w-5 h-5" /> Adicionar Novo Alimento
          </button>
        </div>

        {/* Tabela de Resultados */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-rose-600" /></div>
          ) : alimentos.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Nenhum alimento encontrado. Tente buscar de outra forma ou adicione um novo.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-sm font-bold text-slate-700">Nome do Alimento</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-700">Porção</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-700">Macros (C/P/L)</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-700 text-center">Configurações Especiais</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-700 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alimentos.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800 truncate max-w-xs" title={item.nome_exibicao}>{item.nome_exibicao}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.porcao_padrao || '100g'}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2 text-[10px] font-mono font-bold">
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">C:{item.cho}</span>
                          <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded">P:{item.ptn}</span>
                          <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded">L:{item.lip}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {item.peso_unitario && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold" title="Tem peso por unidade cadastrado">⚖️ Un</span>
                          )}
                          {item.medidas_customizadas && item.medidas_customizadas.length > 0 && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold" title="Tem medida caseira customizada">✨ Medida</span>
                          )}
                          {!item.peso_unitario && (!item.medidas_customizadas || item.medidas_customizadas.length === 0) && (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => abrirModalEditar(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleExcluir(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE EDIÇÃO DE ALIMENTO E MEDIDA CUSTOMIZADA COM BUSCA NA WEB */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">{form.id ? 'Editar Alimento' : 'Novo Alimento'}</h3>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto bg-white">
              
              <div className="relative">
                <label className="block text-sm font-semibold mb-1 text-slate-700">Nome do Alimento</label>
                <div className="flex items-center gap-2">
                  <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="flex-1 px-3 py-2 border border-slate-300 focus:border-rose-500 rounded outline-none" />
                  <button 
                    onClick={handleBuscarNaWeb}
                    disabled={buscandoWeb || !form.nome.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors disabled:opacity-50 font-medium text-sm"
                    title="Buscar tabela nutricional em Open Food Facts"
                  >
                    {buscandoWeb ? <Loader2 className="w-4 h-4 animate-spin"/> : <Globe className="w-4 h-4"/>} Web
                  </button>
                </div>

                {resultadosWeb.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    <div className="px-3 py-2 bg-blue-50 flex items-center justify-between sticky top-0">
                      <span className="text-[10px] font-bold text-blue-800 uppercase">Resultados da Internet (100g)</span>
                      <button onClick={() => setResultadosWeb([])}><X className="w-3 h-3 text-blue-800"/></button>
                    </div>
                    {resultadosWeb.map((p, idx) => (
                      <div key={idx} onClick={() => selecionarProdutoWeb(p)} className="p-3 hover:bg-slate-50 cursor-pointer">
                        <p className="text-sm font-bold text-slate-800 line-clamp-1">{p.product_name_pt || p.product_name} {p.brands ? `(${p.brands.split(',')[0]})` : ''}</p>
                        <div className="flex gap-2 mt-1 text-[10px] font-mono text-slate-500">
                          <span>C: {p.nutriments.carbohydrates_100g || 0}g</span>
                          <span>P: {p.nutriments.proteins_100g || 0}g</span>
                          <span>L: {p.nutriments.fat_100g || 0}g</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-emerald-700">Porção Padrão</label>
                  <input type="text" value={form.porcao} onChange={e => setForm({...form, porcao: e.target.value})} placeholder="Ex: 100g" className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50 rounded text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-blue-700" title="Usado para calcular a quantidade de unidades na varinha mágica.">Peso Unidade (g)</label>
                  <input type="number" value={form.pesoUnitario} onChange={e => setForm({...form, pesoUnitario: e.target.value})} placeholder="Ex: 12" className="w-full px-3 py-2 border border-blue-300 bg-blue-50 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 -mt-3">Os macros abaixo devem ser referentes à <b>Porção Padrão</b>.</p>
              
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div><label className="block text-xs font-semibold mb-1">CHO (g)</label><input type="number" value={form.cho} onChange={e => setForm({...form, cho: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-rose-500" /></div>
                <div><label className="block text-xs font-semibold mb-1">PTN (g)</label><input type="number" value={form.ptn} onChange={e => setForm({...form, ptn: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-rose-500" /></div>
                <div><label className="block text-xs font-semibold mb-1">LIP (g)</label><input type="number" value={form.lip} onChange={e => setForm({...form, lip: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-rose-500" /></div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-1"><Wand2 className="w-4 h-4"/> Medidas Caseiras Específicas</h4>
                <p className="text-[10px] text-slate-500 mb-3 leading-tight">Defina quanto pesa uma medida apenas para este alimento (Ex: Colher de sopa = 3g CHO). O sistema calculará o peso em gramas.</p>
                
                <div className="flex items-center gap-2 mb-3">
                  <select 
                    value={novaMedida.nome} 
                    onChange={e => setNovaMedida({...novaMedida, nome: e.target.value})}
                    className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-amber-500 bg-white"
                  >
                    <option value="colher de sopa">Colher de Sopa</option>
                    <option value="colher de sobremesa">Colher de Sobremesa</option>
                    <option value="colher de chá">Colher de Chá</option>
                    <option value="concha">Concha</option>
                    <option value="escumadeira">Escumadeira</option>
                    <option value="xícara">Xícara</option>
                    <option value="fatia">Fatia</option>
                    <option value="copo">Copo</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2 mb-3 bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-xs text-slate-600 font-semibold">=</span>
                  <input 
                    type="number" 
                    placeholder="Ex: 3"
                    value={novaMedida.valor}
                    onChange={e => setNovaMedida({...novaMedida, valor: e.target.value})}
                    className="w-16 px-2 py-1.5 border border-slate-300 rounded text-xs outline-none text-center focus:border-amber-500"
                  />
                  <span className="text-xs text-slate-600 font-semibold">g de</span>
                  <select 
                    value={novaMedida.macroRef} 
                    onChange={e => setNovaMedida({...novaMedida, macroRef: e.target.value})}
                    className="w-20 px-2 py-1.5 border border-slate-300 rounded text-xs outline-none font-bold text-slate-700 focus:border-amber-500 bg-white"
                  >
                    <option value="cho">CHO</option>
                    <option value="ptn">PTN</option>
                    <option value="lip">LIP</option>
                  </select>
                  
                  <button type="button" onClick={handleAddMedidaCustomizada} className="ml-auto p-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition border border-amber-200" title="Adicionar Regra">
                    <Plus className="w-4 h-4"/>
                  </button>
                </div>

                {form.medidasCustomizadas.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {form.medidasCustomizadas.map((mc, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-amber-50/50 px-3 py-2 rounded border border-amber-100 shadow-sm">
                        <span className="font-semibold text-slate-700 capitalize">{mc.nome} <span className="font-normal text-slate-400">({mc.peso_g.toFixed(1)}g)</span></span>
                        <button type="button" onClick={() => handleRemoverMedidaCustomizada(idx)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t shrink-0">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleSalvarAlimento} disabled={salvando || !form.nome.trim()} className="px-6 py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Salvar no Banco'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}