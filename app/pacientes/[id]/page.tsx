'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Pencil, Trash2, FileText, Plus, 
  Calendar, User, Phone, Mail, MapPin, Loader2, 
  Clock, X, Check, Utensils 
} from 'lucide-react';

export default function DetalhesPaciente() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [paciente, setPaciente] = useState<any>(null);
  const [prescricoes, setPrescricoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para o Modal de Edição
  const [modalEdicaoAberta, setModalEdicaoAberta] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [formEdicao, setFormEdicao] = useState({
    nome_completo: '',
    data_nascimento: '',
    cpf: '',
    telefone: '',
    email: '',
    endereco: ''
  });

  // Helper de Datas
  const dataParaFrente = (dataIso: string) => {
    if (!dataIso) return '';
    if (dataIso.includes('-')) {
      const partes = dataIso.split('T')[0].split('-');
      if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataIso;
  };

  const dataParaBanco = (dataBr: string) => {
    if (!dataBr) return null;
    if (dataBr.includes('/')) {
      const partes = dataBr.split('/');
      if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
    return dataBr;
  };

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const { data: pacData, error: pacError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (pacError) throw pacError;
      
      setPaciente(pacData);
      setFormEdicao({
        nome_completo: pacData.nome_completo || '',
        data_nascimento: dataParaFrente(pacData.data_nascimento),
        cpf: pacData.cpf || '',
        telefone: pacData.telefone || '',
        email: pacData.email || '',
        endereco: pacData.endereco_completo || pacData.endereco || ''
      });

      const { data: prescData, error: prescError } = await supabase
        .from('prescricoes')
        .select('*')
        .eq('paciente_id', id)
        .order('created_at', { ascending: false });

      if (prescError) throw prescError;
      setPrescricoes(prescData || []);

    } catch (err) {
      console.error("Erro ao buscar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirPrescricao = async (prescricaoId: string) => {
    if (!window.confirm("Tem certeza que deseja apagar permanentemente esta prescrição?")) return;
    try {
      const { error } = await supabase.from('prescricoes').delete().eq('id', prescricaoId);
      if (error) throw error;
      setPrescricoes(prescricoes.filter(p => p.id !== prescricaoId));
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir prescrição.");
    }
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoEdicao(true);
    try {
      const camposAtualizados: any = {
        nome_completo: formEdicao.nome_completo,
        data_nascimento: dataParaBanco(formEdicao.data_nascimento),
        cpf: formEdicao.cpf,
        telefone: formEdicao.telefone,
        email: formEdicao.email,
      };

      if (paciente.endereco_completo !== undefined) {
        camposAtualizados.endereco_completo = formEdicao.endereco;
      } else {
        camposAtualizados.endereco = formEdicao.endereco;
      }

      const { error } = await supabase.from('pacientes').update(camposAtualizados).eq('id', paciente.id);
      if (error) throw error;

      setPaciente({ ...paciente, ...camposAtualizados });
      setModalEdicaoAberta(false);
    } catch (err) {
      console.error("Erro ao atualizar paciente:", err);
      alert("Erro ao salvar alterações.");
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const formatarDataHora = (dataString: string) => {
    if (!dataString) return '--';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR') + ' às ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <p className="text-slate-600">Paciente não encontrado.</p>
        <Link href="/pacientes" className="text-emerald-600 hover:underline">Voltar para lista</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* HEADER NAVEGAÇÃO */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/pacientes" className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors font-medium">
            <ArrowLeft className="w-5 h-5" /> Voltar para Pacientes
          </Link>
          <Link 
            href={`/prescricoes/nova?pacienteId=${paciente.id}`} 
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" /> Nova Prescrição
          </Link>
        </div>
      </div>

      {/* CONTAINER PRINCIPAL DA PÁGINA (A "Ficha" Branca) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          
          {/* CABEÇALHO DO PACIENTE */}
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{paciente.nome_completo}</h1>
              <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
                <User className="w-4 h-4" /> Prontuário Médico & Nutricional
              </p>
            </div>
            <button 
              onClick={() => setModalEdicaoAberta(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors text-sm font-semibold shrink-0"
            >
              <Pencil className="w-4 h-4" /> Editar Dados
            </button>
          </div>

          {/* DADOS PESSOAIS - GRID HORIZONTAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100 mb-12">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Nascimento</p>
              <p className="text-slate-800 font-semibold">{dataParaFrente(paciente.data_nascimento) || '--'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> CPF</p>
              <p className="text-slate-800 font-semibold">{paciente.cpf || '--'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> Telefone</p>
              <p className="text-slate-800 font-semibold">{paciente.telefone || '--'}</p>
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> E-mail</p>
              <p className="text-slate-800 font-semibold truncate" title={paciente.email}>{paciente.email || '--'}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Endereço</p>
              <p className="text-slate-800 font-semibold">{paciente.endereco_completo || paciente.endereco || '--'}</p>
            </div>
          </div>

          {/* SESSÃO: HISTÓRICO DE CONSULTAS */}
          <div className="mb-14">
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" /> Consultas e Anamnese
              </h2>
              <button className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Novo Registro
              </button>
            </div>
            <div className="py-8 flex flex-col items-center justify-center text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <FileText className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-slate-500 font-medium">Nenhuma consulta ou anamnese registrada.</p>
            </div>
          </div>

          {/* SESSÃO: PRESCRIÇÕES */}
          <div>
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Utensils className="w-6 h-6 text-emerald-600" /> Prescrições (Dietas)
              </h2>
            </div>
            
            {prescricoes.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <Utensils className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-slate-500 font-medium">Nenhuma dieta gerada para este paciente.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {prescricoes.map((presc) => (
                  <div key={presc.id} className="group flex flex-col md:flex-row md:items-center justify-between py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors px-4 rounded-lg -mx-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-lg">Dieta Prescrita</p>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 mt-0.5">
                          <Clock className="w-4 h-4" />
                          Gerada em {formatarDataHora(presc.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                      <Link 
                        href={`/prescricoes/nova?editId=${presc.id}`} 
                        className="px-5 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors"
                      >
                        Editar / Imprimir
                      </Link>
                      <button 
                        onClick={() => handleExcluirPrescricao(presc.id)}
                        className="p-2 text-slate-400 bg-white border border-slate-200 rounded-lg hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                        title="Apagar Prescrição"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ========================================================
          MODAL DE EDIÇÃO DE PACIENTE
          ======================================================== */}
      {modalEdicaoAberta && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-emerald-600" /> Editar Dados do Paciente
              </h3>
              <button onClick={() => setModalEdicaoAberta(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="form-edicao-paciente" onSubmit={handleSalvarEdicao} className="space-y-5">
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={formEdicao.nome_completo}
                    onChange={(e) => setFormEdicao({...formEdicao, nome_completo: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Data de Nascimento</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 13/07/1991"
                      value={formEdicao.data_nascimento}
                      onChange={(e) => setFormEdicao({...formEdicao, data_nascimento: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">CPF</label>
                    <input 
                      type="text" 
                      placeholder="Apenas números"
                      value={formEdicao.cpf}
                      onChange={(e) => setFormEdicao({...formEdicao, cpf: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Telefone</label>
                    <input 
                      type="text" 
                      placeholder="(DDD) 99999-9999"
                      value={formEdicao.telefone}
                      onChange={(e) => setFormEdicao({...formEdicao, telefone: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
                    <input 
                      type="email" 
                      placeholder="paciente@email.com"
                      value={formEdicao.email}
                      onChange={(e) => setFormEdicao({...formEdicao, email: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Endereço Completo</label>
                  <textarea 
                    rows={2}
                    value={formEdicao.endereco}
                    onChange={(e) => setFormEdicao({...formEdicao, endereco: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>

              </form>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setModalEdicaoAberta(false)}
                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="form-edicao-paciente"
                disabled={salvandoEdicao}
                className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition disabled:bg-slate-400 flex items-center gap-2"
              >
                {salvandoEdicao ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Check className="w-4 h-4" /> Salvar Alterações</>}
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}