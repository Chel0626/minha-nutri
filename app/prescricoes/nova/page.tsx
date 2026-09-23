'use client';

import { useState, Fragment, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePacientes, usePreConfiguracoes } from '@/hooks/useDatabase';
import { Paciente, PreConfiguracao } from '@/types/database.types';
import { ChevronDown, Plus, Trash2, Check, Printer, FileSignature, X, Loader2, Pencil, ArrowUp, ArrowDown, Type, ListChecks, Utensils, AlignLeft, GripVertical, Target, Smartphone, Mail, Globe } from 'lucide-react';
import BuscaAlimento from '@/components/BuscaAlimento';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ItemAlimento { id: string; dbId?: string; nome: string; quantidade: string; baseMacros?: { cho: number; ptn: number; lip: number }; macroAtivo?: 'cho' | 'ptn' | 'lip' | null; macroAlvo?: string; conexao?: 'nova_linha' | 'mais' | 'ou'; porcao_padrao?: string; }
interface Opcao { id: string; itens: ItemAlimento[]; }
type TipoBloco = 'condutas' | 'refeicao' | 'texto_livre';
interface Bloco { id: string; tipo: TipoBloco; nome?: string; metaCarboidratos?: string; mostrarMeta?: boolean; opcoes?: Opcao[]; titulo?: string; conteudoTexto: string; expandido?: boolean; colapsado?: boolean; }
interface ItemTabela { id: string; dbId?: string; nome: string; baseMacro: number; macrosReal?: { cho: number; ptn: number; lip: number }; porcao_padrao?: string; }
interface MetadadosPrescricion { pacienteId: string; pacienteNome: string; faseCaloricas: string; dataPrescricao: string; }

const parseQtd = (str: string) => { const match = str.match(/[\d.,]+/); return match ? parseFloat(match[0].replace(',', '.')) : 0; };

// ----- COLE ESTE BLOCO AQUI -----
const calcularTotalMacros = (opcao?: Opcao) => {
  let total = { cho: 0, ptn: 0, lip: 0, kcal: 0 };
  if (!opcao || !opcao.itens) return { cho: '0.0', ptn: '0.0', lip: '0.0', kcal: '0' };
  
  opcao.itens.forEach(item => {
    const qtdNum = parseQtd(item.quantidade);
    if (qtdNum > 0 && item.baseMacros) {
      let bNum = 100;
      const mN = (item.porcao_padrao || '100g').match(/[\d.,]+/);
      if (mN) bNum = parseFloat(mN[0].replace(',', '.'));
      
      if (bNum > 0) {
        total.cho += (item.baseMacros.cho * qtdNum) / bNum;
        total.ptn += (item.baseMacros.ptn * qtdNum) / bNum;
        total.lip += (item.baseMacros.lip * qtdNum) / bNum;
      }
    }
  });
  total.kcal = (total.cho * 4) + (total.ptn * 4) + (total.lip * 9);
  
  return {
    cho: total.cho.toFixed(1),
    ptn: total.ptn.toFixed(1),
    lip: total.lip.toFixed(1),
    kcal: Math.round(total.kcal).toString()
  };
};
// ---------------------------------

const TABELA_PROTEINAS = [ { nome: 'Frango (Peito, cozido)', base: 31.5 }, { nome: 'Carne vermelha magra (Patinho, cozido)', base: 35.9 }, { nome: 'Peixe (Pescada/Atum natural)', base: 26.6 }, { nome: 'Lombo suíno (assado)', base: 35.7 } ];
const TABELA_ARROZ = [ { nome: 'Batata Doce (cozida)', base: 18.4 }, { nome: 'Batata Inglesa / Purê', base: 11.9 }, { nome: 'Cará (cozido)', base: 18.9 }, { nome: 'Inhame (cozido)', base: 23.5 }, { nome: 'Mandioca (cozida)', base: 30.1 }, { nome: 'Mandioquinha (cozida)', base: 18.9 }, { nome: 'Milho-verde (enlatado)', base: 17.1 } ];
const TABELA_FRUTAS = [ { nome: 'Abacaxi', base: 12.3 }, { nome: 'Banana Prata', base: 26.0 }, { nome: 'Goiaba', base: 13.0 }, { nome: 'Laranja', base: 8.9 }, { nome: 'Mamão', base: 11.6 }, { nome: 'Manga', base: 15.0 }, { nome: 'Maçã', base: 15.2 }, { nome: 'Melancia', base: 6.8 }, { nome: 'Melão', base: 7.5 }, { nome: 'Morango', base: 6.8 }, { nome: 'Uva', base: 17.3 } ];

function PrescricaoEditor() {
  const { pacientes } = usePacientes();
  const { preConfigs } = usePreConfiguracoes();
  const searchParams = useSearchParams();
  const router = useRouter();

  const editId = searchParams?.get('editId');
  const pacienteQueryId = searchParams?.get('pacienteId');

  const dataAtual = new Date().toLocaleDateString('pt-BR');
  const [metadados, setMetadados] = useState<MetadadosPrescricion>({ pacienteId: '', pacienteNome: '', faseCaloricas: '', dataPrescricao: dataAtual });
  const [tabelasColapsadas, setTabelasColapsadas] = useState(true);

  const [blocos, setBlocos] = useState<Bloco[]>([{
    id: `ref-${Date.now()}`, tipo: 'refeicao', nome: 'Café da Manhã', metaCarboidratos: 'até 30g de Carboidratos', mostrarMeta: true, colapsado: false,
    conteudoTexto: '', opcoes: [{ id: `op-${Date.now()}`, itens: [{ id: `it-${Date.now()}`, quantidade: '', nome: '', conexao: 'nova_linha', porcao_padrao: '100g' }] }]
  }]);

  const [tabelasSelecionadas, setTabelasSelecionadas] = useState({ proteinas: false, substitutosArroz: false, frutas: false });
  const [alvosTabelas, setAlvosTabelas] = useState({ proteinas: '', substitutosArroz: '', frutas: '' });

  const [tabelaProteinas, setTabelaProteinas] = useState<ItemTabela[]>(TABELA_PROTEINAS.map((t, i) => ({ id: `tp-${i}`, nome: t.nome, baseMacro: t.base, macrosReal: { cho: 0, ptn: t.base, lip: 0 }, porcao_padrao: '100g' })));
  const [tabelaArroz, setTabelaArroz] = useState<ItemTabela[]>(TABELA_ARROZ.map((t, i) => ({ id: `ta-${i}`, nome: t.nome, baseMacro: t.base, macrosReal: { cho: t.base, ptn: 0, lip: 0 }, porcao_padrao: '100g' })));
  const [tabelaFrutas, setTabelaFrutas] = useState<ItemTabela[]>(TABELA_FRUTAS.map((t, i) => ({ id: `tf-${i}`, nome: t.nome, baseMacro: t.base, macrosReal: { cho: t.base, ptn: 0, lip: 0 }, porcao_padrao: '100g' })));

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal de edição agora tem a porção
  const [modalEdicao, setModalEdicao] = useState({ isOpen: false, id: '', nome: '', cho: '', ptn: '', lip: '', porcao: '100g' });
  const [salvandoAlimento, setSalvandoAlimento] = useState(false);
  const caloriasCalculadas = (parseFloat(modalEdicao.cho) || 0) * 4 + (parseFloat(modalEdicao.ptn) || 0) * 4 + (parseFloat(modalEdicao.lip) || 0) * 9;

  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  useEffect(() => {
    if (editId) {
      carregarDietaSalva(editId);
    } else if (pacienteQueryId && pacientes.length > 0) {
      const paciente = pacientes.find((p) => p.id === pacienteQueryId);
      setMetadados(prev => ({ ...prev, pacienteId: pacienteQueryId, pacienteNome: paciente?.nome_completo || '' }));
    }
  }, [editId, pacienteQueryId, pacientes]);

  const carregarDietaSalva = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('prescricoes').select('*').eq('id', id).single();
      if (error) throw error;

      if (data && data.dados_estruturados) {
        const d = data.dados_estruturados;
        setBlocos(d.blocos || []);
        setTabelasSelecionadas(d.tabelasSelecionadas || { proteinas: false, substitutosArroz: false, frutas: false });
        setAlvosTabelas(d.alvosTabelas || { proteinas: '', substitutosArroz: '', frutas: '' });
        setTabelaProteinas(d.tabelaProteinas || TABELA_PROTEINAS.map((t, i) => ({ id: `tp-${i}`, nome: t.nome, baseMacro: t.base, macrosReal: { cho: 0, ptn: t.base, lip: 0 }, porcao_padrao: '100g' })));
        setTabelaArroz(d.tabelaArroz || TABELA_ARROZ.map((t, i) => ({ id: `ta-${i}`, nome: t.nome, baseMacro: t.base, macrosReal: { cho: t.base, ptn: 0, lip: 0 }, porcao_padrao: '100g' })));
        setTabelaFrutas(d.tabelaFrutas || TABELA_FRUTAS.map((t, i) => ({ id: `tf-${i}`, nome: t.nome, baseMacro: t.base, macrosReal: { cho: t.base, ptn: 0, lip: 0 }, porcao_padrao: '100g' })));
        if (d.metadados) setMetadados(d.metadados);
      } else {
        alert("Aviso: Esta é uma prescrição antiga salva apenas em modo de leitura de texto.");
        setMetadados(prev => ({ ...prev, pacienteId: data.paciente_id }));
      }
    } catch (err) {} finally { setLoading(false); }
  };

  const configsPorCategoria = preConfigs.reduce((acc, config: PreConfiguracao) => {
    if (!acc[config.categoria]) acc[config.categoria] = []; acc[config.categoria].push(config); return acc;
  }, {} as Record<string, PreConfiguracao[]>);

  const handlePacienteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const paciente = pacientes.find((p) => p.id === e.target.value);
    setMetadados({ ...metadados, pacienteId: e.target.value, pacienteNome: paciente?.nome_completo || '' });
  };
  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => setMetadados({ ...metadados, dataPrescricao: e.target.value });

  const adicionarBloco = (tipo: TipoBloco) => {
    const novoBloco: Bloco = { id: `${tipo}-${Date.now()}`, tipo, conteudoTexto: '', mostrarMeta: true, colapsado: false };
    if (tipo === 'refeicao') { novoBloco.nome = ''; novoBloco.metaCarboidratos = 'até 30g de Carboidratos'; novoBloco.opcoes = [{ id: `op-${Date.now()}`, itens: [{ id: `it-${Date.now()}`, quantidade: '', nome: '', conexao: 'nova_linha', porcao_padrao: '100g' }] }]; }
    else if (tipo === 'texto_livre') novoBloco.titulo = 'Título da Sessão';
    else if (tipo === 'condutas') novoBloco.expandido = false;
    setBlocos([...blocos, novoBloco]);
  };
  const removerBloco = (id: string) => setBlocos(blocos.filter(b => b.id !== id));
  const moverBloco = (index: number, direcao: 'cima' | 'baixo') => {
    if ((direcao === 'cima' && index === 0) || (direcao === 'baixo' && index === blocos.length - 1)) return;
    const novosBlocos = [...blocos]; const alvo = direcao === 'cima' ? index - 1 : index + 1;
    [novosBlocos[index], novosBlocos[alvo]] = [novosBlocos[alvo], novosBlocos[index]]; setBlocos(novosBlocos);
  };
  const atualizarBloco = (id: string, campo: keyof Bloco, valor: any) => setBlocos(blocos.map(b => (b.id === id ? { ...b, [campo]: valor } : b)));
  
  const toggleCondutaBloco = (blocoId: string, conteudo: string, checked: boolean) => {
    setBlocos(blocos.map(b => {
      if (b.id === blocoId && b.tipo === 'condutas') {
        let novo = b.conteudoTexto || '';
        if (checked) novo = !novo.includes(conteudo) ? (novo ? `${novo}\n\n${conteudo}` : conteudo) : novo;
        else novo = novo.replace(`\n\n${conteudo}`, '').replace(`${conteudo}\n\n`, '').replace(conteudo, '');
        return { ...b, conteudoTexto: novo.trim() };
      }
      return b;
    }));
  };
  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>, blocoId: string) => {
    e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px';
    atualizarBloco(blocoId, 'conteudoTexto', e.target.value);
  };

  const adicionarOpcao = (blocoId: string) => setBlocos(blocos.map(b => b.id === blocoId && b.tipo === 'refeicao' ? { ...b, opcoes: [...(b.opcoes || []), { id: `op-${Date.now()}`, itens: [{ id: `it-${Date.now()}`, quantidade: '', nome: '', conexao: 'nova_linha', porcao_padrao: '100g' }] }] } : b));
  const removerOpcao = (blocoId: string, opcaoId: string) => setBlocos(blocos.map(b => b.id === blocoId && b.tipo === 'refeicao' ? { ...b, opcoes: (b.opcoes || []).filter(o => o.id !== opcaoId) } : b));

  const adicionarItem = (blocoId: string, opcaoId: string, conexao: 'nova_linha' | 'mais' | 'ou' = 'nova_linha', insertAfterId?: string) => {
    setBlocos(blocos.map(b => {
      if (b.id !== blocoId || b.tipo !== 'refeicao') return b;
      return {
        ...b, opcoes: (b.opcoes || []).map(o => {
          if (o.id !== opcaoId) return o;
          const newItem = { id: `it-${Date.now()}`, quantidade: '', nome: '', conexao, porcao_padrao: '100g' };
          if (insertAfterId) {
            const idx = o.itens.findIndex(i => i.id === insertAfterId);
            if (idx >= 0) { const newItens = [...o.itens]; newItens.splice(idx + 1, 0, newItem); return { ...o, itens: newItens }; }
          }
          return { ...o, itens: [...o.itens, newItem] };
        })
      };
    }));
  };
  const removerItem = (blocoId: string, opcaoId: string, itemId: string) => setBlocos(blocos.map(b => b.id === blocoId && b.tipo === 'refeicao' ? { ...b, opcoes: (b.opcoes || []).map(o => o.id === opcaoId ? { ...o, itens: o.itens.filter(i => i.id !== itemId) } : o) } : b));
  const atualizarItem = (blocoId: string, opcaoId: string, itemId: string, campo: keyof ItemAlimento, valor: any) => setBlocos(blocos.map(b => b.id === blocoId && b.tipo === 'refeicao' ? { ...b, opcoes: (b.opcoes || []).map(o => o.id === opcaoId ? { ...o, itens: o.itens.map(i => i.id === itemId ? { ...i, [campo]: valor } : i) } : o) } : b));
  const toggleMacroAtivo = (blocoId: string, opcaoId: string, itemId: string, macro: 'cho' | 'ptn' | 'lip' | null) => setBlocos(blocos.map(b => b.id === blocoId && b.tipo === 'refeicao' ? { ...b, opcoes: (b.opcoes || []).map(o => o.id === opcaoId ? { ...o, itens: o.itens.map(i => i.id === itemId ? { ...i, macroAtivo: macro, macroAlvo: '' } : i) } : o) } : b));
  
  // CALCULADORA INTELIGENTE (Detecta g, ml, unidades)
  const atualizarAlvoMacro = (blocoId: string, opcaoId: string, itemId: string, valor: string) => {
    setBlocos(blocos.map(b => {
      if (b.id !== blocoId || b.tipo !== 'refeicao') return b;
      return { ...b, opcoes: (b.opcoes || []).map(o => { 
        if (o.id !== opcaoId) return o; 
        return { ...o, itens: o.itens.map(i => { 
          if (i.id !== itemId) return i; 
          let newQtd = i.quantidade; 
          
          if (i.macroAtivo && i.baseMacros && valor !== '') { 
            const target = parseFloat(valor); 
            const base = i.baseMacros[i.macroAtivo]; 
            if (base > 0 && !isNaN(target)) { 
              let baseNum = 100;
              let baseUnit = 'g';
              const porc = i.porcao_padrao || '100g';
              
              const matchNum = porc.match(/[\d.,]+/);
              const matchUnit = porc.match(/[a-zA-ZçÇãõáéíóú]+/i);
              
              if (matchNum) baseNum = parseFloat(matchNum[0].replace(',', '.'));
              if (matchUnit) baseUnit = matchUnit[0].toLowerCase();

              let val = (target * baseNum) / base;

              // Arredondamentos inteligentes dependendo do tipo da unidade
              if (baseUnit.startsWith('uni') || baseUnit.startsWith('u') || baseUnit.startsWith('fati')) {
                val = Math.round(val * 2) / 2; // Passos de 0.5 (Ex: 1.5 unidades)
              } else if (baseUnit === 'ml') {
                val = Math.round(val / 5) * 5; // Passos de 5 ml
              } else {
                val = Math.round(val / 5) * 5; // Passos de 5 g
              }

              // Deixa a exibição bonita
              newQtd = `${val}${baseUnit === 'g' || baseUnit === 'ml' ? baseUnit : ' ' + baseUnit}`;
            } else if (base === 0) {
              newQtd = '0';
            } 
          } 
          return { ...i, macroAlvo: valor, quantidade: newQtd }; 
        }) }; 
      }) };
    }));
  };

  const toggleTabela = (tabela: 'proteinas' | 'substitutosArroz' | 'frutas') => setTabelasSelecionadas({ ...tabelasSelecionadas, [tabela]: !tabelasSelecionadas[tabela] });
  const adicionarItemTabela = (tabela: 'proteinas' | 'arroz' | 'frutas') => {
    const newItem = { id: `tab-${Date.now()}`, nome: '', baseMacro: 0, porcao_padrao: '100g' };
    if (tabela === 'proteinas') setTabelaProteinas([...tabelaProteinas, newItem]); if (tabela === 'arroz') setTabelaArroz([...tabelaArroz, newItem]); if (tabela === 'frutas') setTabelaFrutas([...tabelaFrutas, newItem]);
  };
  const removerItemTabela = (tabela: 'proteinas' | 'arroz' | 'frutas', id: string) => {
    if (tabela === 'proteinas') setTabelaProteinas(prev => prev.filter(i => i.id !== id)); if (tabela === 'arroz') setTabelaArroz(prev => prev.filter(i => i.id !== id)); if (tabela === 'frutas') setTabelaFrutas(prev => prev.filter(i => i.id !== id));
  };
  const atualizarItemTabela = (tabela: 'proteinas' | 'arroz' | 'frutas', id: string, nome: string, macros: { cho: number, ptn: number, lip: number }, dbId?: string) => {
    const baseMacro = tabela === 'proteinas' ? macros.ptn : macros.cho;
    const updateFn = (prev: ItemTabela[]) => prev.map(i => i.id === id ? { ...i, nome, baseMacro, macrosReal: macros, dbId } : i);
    if (tabela === 'proteinas') setTabelaProteinas(updateFn); else if (tabela === 'arroz') setTabelaArroz(updateFn); else if (tabela === 'frutas') setTabelaFrutas(updateFn);
  };
  
  // CALCULADORA DAS TABELAS
  const calcularPesoEquivalente = (alvo: string, baseMacro: number, porcaoPadrao: string = '100g') => { 
    const alvoNum = parseFloat(alvo); 
    if (isNaN(alvoNum) || baseMacro === 0) return '--'; 
    
    let baseNum = 100;
    let baseUnit = 'g';
    const matchNum = porcaoPadrao.match(/[\d.,]+/);
    const matchUnit = porcaoPadrao.match(/[a-zA-ZçÇãõáéíóú]+/i);
    
    if (matchNum) baseNum = parseFloat(matchNum[0].replace(',', '.'));
    if (matchUnit) baseUnit = matchUnit[0].toLowerCase();

    let val = (alvoNum * baseNum) / baseMacro;

    if (baseUnit.startsWith('uni') || baseUnit.startsWith('u') || baseUnit.startsWith('fati')) {
      val = Math.round(val * 2) / 2;
    } else {
      val = Math.round(val / 5) * 5;
    }

    return `${val}${baseUnit === 'g' || baseUnit === 'ml' ? baseUnit : ' ' + baseUnit}`; 
  };

  // BUSCA REAL DO BANCO QUANDO CLICA NO LÁPIS
  const handleAbrirEdicao = async (dbId: string | undefined, nomeLocal: string, macrosLocal: any) => {
    if (dbId && !dbId.startsWith('custom_')) {
      try {
        const { data, error } = await supabase.from('alimentos').select('*').eq('id', dbId).single();
        if (data && !error) {
          setModalEdicao({
            isOpen: true, id: data.id, nome: data.nome_exibicao || data.nome,
            cho: String(data.cho || 0), ptn: String(data.ptn || 0), lip: String(data.lip || 0),
            porcao: data.porcao_padrao || '100g'
          });
          return;
        }
      } catch (err) {}
    }
    // Fallback se não tiver no banco ainda
    setModalEdicao({
      isOpen: true, id: dbId || '', nome: nomeLocal,
      cho: String(macrosLocal?.cho || 0), ptn: String(macrosLocal?.ptn || 0), lip: String(macrosLocal?.lip || 0),
      porcao: '100g'
    });
  };

  // SALVAR E ATUALIZAR A TELA INTEIRA EM TEMPO REAL
  const handleAtualizarAlimento = async () => {
    if (!modalEdicao.nome.trim()) { alert("O nome do alimento não pode estar vazio."); return; }
    setSalvandoAlimento(true);
    try {
      const dadosSalvar = { 
        nome_exibicao: modalEdicao.nome, cho: parseFloat(modalEdicao.cho) || 0, 
        ptn: parseFloat(modalEdicao.ptn) || 0, lip: parseFloat(modalEdicao.lip) || 0, 
        kcal: caloriasCalculadas, porcao_padrao: modalEdicao.porcao 
      };
      
      if (modalEdicao.id && !modalEdicao.id.startsWith('custom_')) {
        await supabase.from('alimentos').update(dadosSalvar).eq('id', modalEdicao.id);
      } else {
        const fakeId = `custom_${Date.now()}`;
        await supabase.from('alimentos').insert([{ id: fakeId, ...dadosSalvar }]);
        setModalEdicao(prev => ({ ...prev, id: fakeId }));
      }

      // MÁGICA: ATUALIZA A TELA IMEDIATAMENTE APÓS SALVAR
      const newMacros = { cho: dadosSalvar.cho, ptn: dadosSalvar.ptn, lip: dadosSalvar.lip };
      
      // 1. Atualiza nas Refeições
      setBlocos(prevBlocos => prevBlocos.map(b => {
        if (b.tipo !== 'refeicao') return b;
        return {
          ...b,
          opcoes: b.opcoes?.map(o => ({
            ...o,
            itens: o.itens.map(i => {
              if (i.dbId === modalEdicao.id || i.nome === modalEdicao.nome) {
                // Se tiver meta setada, recalcula!
                let newQtd = i.quantidade;
                if (i.macroAtivo && i.macroAlvo) {
                   const t = parseFloat(i.macroAlvo);
                   const base = newMacros[i.macroAtivo];
                   if(base > 0 && !isNaN(t)) {
                     let bn = 100; let bu = 'g';
                     const mN = dadosSalvar.porcao_padrao.match(/[\d.,]+/);
                     const mU = dadosSalvar.porcao_padrao.match(/[a-zA-ZçÇãõáéíóú]+/i);
                     if (mN) bn = parseFloat(mN[0].replace(',','.'));
                     if (mU) bu = mU[0].toLowerCase();
                     let v = (t * bn) / base;
                     if (bu.startsWith('u') || bu.startsWith('f')) v = Math.round(v * 2) / 2;
                     else v = Math.round(v / 5) * 5;
                     newQtd = `${v}${bu === 'g' || bu === 'ml' ? bu : ' '+bu}`;
                   }
                }
                return { ...i, nome: dadosSalvar.nome_exibicao, baseMacros: newMacros, porcao_padrao: dadosSalvar.porcao_padrao, quantidade: newQtd };
              }
              return i;
            })
          }))
        };
      }));

      // 2. Atualiza nas Tabelas de Equivalência
      const atualizarLinhasTabela = (linhas: ItemTabela[]) => linhas.map(t => {
        if (t.dbId === modalEdicao.id || t.nome === modalEdicao.nome) {
          const baseMacroUpdate = t.nome.toLowerCase().includes('arroz') || t.nome.toLowerCase().includes('fruta') ? newMacros.cho : newMacros.ptn;
          return { ...t, nome: dadosSalvar.nome_exibicao, baseMacro: baseMacroUpdate, macrosReal: newMacros, porcao_padrao: dadosSalvar.porcao_padrao };
        }
        return t;
      });
      setTabelaProteinas(atualizarLinhasTabela(tabelaProteinas));
      setTabelaArroz(atualizarLinhasTabela(tabelaArroz));
      setTabelaFrutas(atualizarLinhasTabela(tabelaFrutas));

      setModalEdicao({ isOpen: false, id: '', nome: '', cho: '', ptn: '', lip: '', porcao: '100g' });
    } catch (err) { alert("Erro ao salvar o alimento."); } 
    finally { setSalvandoAlimento(false); }
  };

  const gerarTextoPrescricao = () => {
    let txt = `Nutrição e Educação em Diabetes\nPaciente: ${metadados.pacienteNome}\nData: ${metadados.dataPrescricao}\n\n${'-'.repeat(60)}\n\n`;

    blocos.forEach((bloco) => {
      if (bloco.tipo === 'condutas' || bloco.tipo === 'texto_livre') {
        if (bloco.titulo) txt += `${bloco.titulo.toUpperCase()}\n`;
        txt += `${bloco.conteudoTexto.trim()}\n\n`;
      } else if (bloco.tipo === 'refeicao') {
        txt += `${(bloco.nome || '').toUpperCase()}\n`;
        if (bloco.mostrarMeta && bloco.metaCarboidratos) txt += `META para INSULINA: ${bloco.metaCarboidratos}\n`;
        
        const temOpcoesPreenchidas = (bloco.opcoes || []).some(o => o.itens.some(i => i.nome || i.quantidade));
        
        if (temOpcoesPreenchidas || bloco.conteudoTexto?.trim()) {
          if (temOpcoesPreenchidas) {
            (bloco.opcoes || []).forEach((opcao, idx) => {
              const temItens = opcao.itens.some(i => i.nome.trim() || i.quantidade.trim());
              if (!temItens) return;

              txt += (bloco.opcoes!.length > 1) ? `\nOpção ${idx + 1}:\n` : `\nSugestão:\n`;
              
              let isPrimeiroItemDaLinha = true;
              opcao.itens.forEach((item, iIndex) => {
                if (!item.nome.trim() && !item.quantidade.trim()) return;
                const isNovaLinha = iIndex === 0 || item.conexao === 'nova_linha' || !item.conexao;
                const val = `${item.quantidade.trim() ? item.quantidade.trim() + ' ' : ''}${item.nome.trim()}`;
                
                if (isNovaLinha) {
                  if (!isPrimeiroItemDaLinha) txt += '\n+ ';
                  else txt += ''; 
                  txt += val;
                  isPrimeiroItemDaLinha = false;
                } else {
                  const con = item.conexao === 'ou' ? ' OU ' : ' + ';
                  txt += `${con}${val}`;
                }
              });
              txt += `\n`;
            });
          }
          if (bloco.conteudoTexto?.trim()) txt += `\n${bloco.conteudoTexto.trim()}\n`;
        }
        txt += `\n`;
      }
    });

    if (tabelasSelecionadas.proteinas && alvosTabelas.proteinas) {
      txt += `${'-'.repeat(60)}\nTABELA 1: PROTEÍNAS ANIMAIS (Alvo: ${alvosTabelas.proteinas}g PTN)\n${'-'.repeat(60)}\n`;
      tabelaProteinas.forEach(i => { if (i.nome) txt += `• ${i.nome} - ${calcularPesoEquivalente(alvosTabelas.proteinas, i.baseMacro, i.porcao_padrao)}\n`; });
      txt += `\n`;
    }
    if (tabelasSelecionadas.substitutosArroz && alvosTabelas.substitutosArroz) {
      txt += `${'-'.repeat(60)}\nTABELA 2: SUBSTITUTOS DE ARROZ (Alvo: ${alvosTabelas.substitutosArroz}g CHO)\n${'-'.repeat(60)}\n`;
      tabelaArroz.forEach(i => { if (i.nome) txt += `• ${i.nome} - ${calcularPesoEquivalente(alvosTabelas.substitutosArroz, i.baseMacro, i.porcao_padrao)}\n`; });
      txt += `\n`;
    }
    if (tabelasSelecionadas.frutas && alvosTabelas.frutas) {
      txt += `${'-'.repeat(60)}\nTABELA 3: FRUTAS (Alvo: ${alvosTabelas.frutas}g CHO)\n${'-'.repeat(60)}\n`;
      tabelaFrutas.forEach(i => { if (i.nome) txt += `• ${i.nome} - ${calcularPesoEquivalente(alvosTabelas.frutas, i.baseMacro, i.porcao_padrao)}\n`; });
      txt += `\n`;
    }
    return txt;
  };

  const handleSalvarPrescricao = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!metadados.pacienteId) { setError('Por favor, selecione um paciente no cabeçalho.'); return; }

    try {
      setLoading(true);
      
      const payload = {
        paciente_id: metadados.pacienteId,
        cardapio_texto: gerarTextoPrescricao(),
        orientacoes_selecionadas: [],
        dados_estruturados: {
          blocos,
          tabelasSelecionadas,
          alvosTabelas,
          tabelaProteinas,
          tabelaArroz,
          tabelaFrutas,
          metadados
        }
      };

      if (editId) {
        const { error: updateError } = await supabase.from('prescricoes').update(payload).eq('id', editId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('prescricoes').insert([payload]);
        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao salvar prescrição'); } 
    finally { setLoading(false); }
  };

  const convertFileToBase64 = (file: File): Promise<string> => { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve((reader.result as string).split(',')[1]); reader.onerror = error => reject(error); }); };
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => { let binary = ''; const bytes = new Uint8Array(buffer); for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]); return window.btoa(binary); };
  
  const getLogoBase64 = async (): Promise<string | null> => {
    try {
      const response = await fetch('/logo.jpg');
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) { return null; }
  };

  const handleAssinar = async () => {
    if (!certFile || !certPassword) { setSignError('Selecione o certificado e digite a senha.'); return; }
    setIsSigning(true); setSignError(null);
    try {
      const element = document.getElementById('print-body'); 
      if (!element) throw new Error("Área de impressão não encontrada");

      const printContainer = document.getElementById('print-area');
      if(printContainer) printContainer.classList.remove('hidden', 'print:block');

      const canvas = await html2canvas(element, { scale: 1.5, useCORS: true });
      if(printContainer) printContainer.classList.add('hidden', 'print:block');

      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const topMargin = 55; 
      const bottomMargin = 25;
      const availableHeight = pageHeight - topMargin - bottomMargin;
      
      const imgWidth = pdfWidth - 24; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = topMargin;
      let currentPage = 1;

      const logoData = await getLogoBase64();

      const drawHeaderFooter = (page: number) => {
        pdf.setPage(page);
        
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, topMargin, 'F');
        pdf.rect(0, pageHeight - bottomMargin, pdfWidth, bottomMargin, 'F');

        if (page === 1) {
          if (logoData) {
            pdf.addImage(logoData, 'JPEG', pdfWidth - 48, 12, 36, 36);
          }
          
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(30, 58, 138); 
          pdf.setFontSize(14);
          pdf.text("Nutrição e Educação em Diabetes", 12, 28);
          
          pdf.setFontSize(13);
          pdf.text("Paciente:", 12, 36);
          pdf.setFont("helvetica", "bold");
          pdf.text(metadados.pacienteNome || '___________________', 32, 36);
          
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.3);
          pdf.setLineDashPattern([1, 1], 0);
          pdf.line(12, 42, pdfWidth - 12, 42); 
          pdf.setLineDashPattern([], 0); 

          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(30, 58, 138); 
          pdf.setFontSize(11);
          pdf.text("Carolina Macedo - Nutricionista (CRN 29096) e Educadora em Diabetes | (19) 98314-1909", 12, 48);
          pdf.setTextColor(0, 102, 204);
          pdf.text("www.carolinaminhanutri.com", 12, 53);
          pdf.setTextColor(30, 58, 138); 
          pdf.text(`Data: ${metadados.dataPrescricao}`, 12, 58);
        }

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(9);
        const txt1 = "Carolina de Souza Silva Macedo - Nutricionista e Educadora em Diabetes - CRN 29096";
        pdf.text(txt1, pdfWidth / 2, pageHeight - 15, { align: "center" });
        
        pdf.setTextColor(0, 102, 204);
        const txt2 = "Tel: (19) 98314-1909   |   E-mail: carolinamacedo.nutri@gmail.com   |   Site: www.carolinaminhanutri.com";
        pdf.text(txt2, pdfWidth / 2, pageHeight - 10, { align: "center" });
      };

      pdf.addImage(imgData, 'JPEG', 12, position, imgWidth, imgHeight);
      drawHeaderFooter(1);
      heightLeft -= availableHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + topMargin; 
        pdf.addPage();
        currentPage++;
        
        pdf.addImage(imgData, 'JPEG', 12, position, imgWidth, imgHeight);
        drawHeaderFooter(currentPage);
        
        heightLeft -= availableHeight;
      }

      pdf.setPage(currentPage);
      const baseY = pageHeight - 22; 
      pdf.setTextColor(0, 0, 0); pdf.setFontSize(14);
      const sigName = 'Carolina de Souza Silva Macedo';
      pdf.text(sigName, 12, baseY);
      pdf.setFontSize(8); 
      pdf.text(`Assinado de forma digital por ${sigName}`, 12 + pdf.getTextWidth(sigName) + 3, baseY - 1.5);
      
      const pdfArrayBuffer = pdf.output('arraybuffer');
      const response = await fetch('/api/assinar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: arrayBufferToBase64(pdfArrayBuffer), certBase64: await convertFileToBase64(certFile), password: certPassword })
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Erro ao assinar documento.');

      const data = await response.json();
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${data.signedPdf}`;
      link.download = `Prescricao_${metadados.pacienteNome || 'Paciente'}_Assinada.pdf`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);

      setIsSignModalOpen(false); setCertPassword(''); setCertFile(null);
    } catch (err: any) { setSignError(err.message || 'Erro inesperado.'); } 
    finally { setIsSigning(false); }
  };

  return (
    <div className="min-h-screen bg-slate-100 relative pb-20 font-sans">
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin-top: 15mm; margin-bottom: 25mm; }
          body { -webkit-print-color-adjust: exact; }
          thead { display: table-header-group; }
        }
      `}} />

      {/* HEADER DE NAVEGAÇÃO */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50 print:hidden">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={`/pacientes/${metadados.pacienteId || ''}`} className="text-slate-500 hover:text-emerald-600 font-medium text-sm transition-colors">
            ← Voltar
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition text-sm">
              <Printer className="w-4 h-4" /> Imprimir 
            </button>
            <button onClick={() => setIsSignModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm text-sm">
              <FileSignature className="w-4 h-4" /> Assinar PDF
            </button>
            <button onClick={handleSalvarPrescricao} disabled={loading} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:bg-slate-400 transition text-sm shadow-sm">
              {loading ? 'Salvando...' : (editId ? 'Atualizar Dieta' : 'Salvar Dieta')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-8 print:hidden">
        {success && <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center gap-3 text-green-700 mx-4"><Check className="w-5 h-5" /> Prescrição salva com sucesso!</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 mx-4">✗ {error}</div>}

        {/* EDITOR VISUAL */}
        <div className="bg-white shadow-xl border border-slate-200 min-h-[1056px] w-full mx-auto p-10 sm:p-16 mb-8 rounded-sm">
          
          <div className="mb-10 text-slate-800">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h1 className="text-[15pt] text-[#1e3a8a] font-normal tracking-wide">Nutrição e Educação em Diabetes</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[13pt] text-[#1e3a8a]">Paciente:</span>
                  <select value={metadados.pacienteId} onChange={handlePacienteChange} className="text-[13pt] font-bold text-[#1e3a8a] outline-none bg-transparent hover:bg-slate-50 border-b border-dashed border-transparent hover:border-slate-300 cursor-pointer">
                    <option value="">Selecione...</option>
                    {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
                  </select>
                </div>
              </div>
              <img src="/logo.jpg" alt="Logo Carolina Macedo" className="w-36 h-36 object-contain" />
            </div>
            
            <hr className="border-t border-dashed border-black my-4 w-full" />
            
            <p className="text-[11pt] text-[#1e3a8a]">Carolina Macedo - Nutricionista (CRN 29096) e Educadora em Diabetes | (19) 98314-1909</p>
            <p className="text-[11pt] text-blue-600 underline">www.carolinaminhanutri.com</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11pt] text-[#1e3a8a]">Data:</span>
              <input type="text" value={metadados.dataPrescricao} onChange={handleDataChange} className="text-[11pt] text-[#1e3a8a] w-32 outline-none bg-transparent hover:bg-slate-50 border-b border-dashed border-transparent hover:border-slate-300" />
            </div>
            <h2 className="text-[13pt] font-bold underline mt-8 mb-6 text-black">Distribuição dos carboidratos por refeição:</h2>
          </div>

          <div className="space-y-4">
            {blocos.map((bloco, index) => (
              <div key={bloco.id} className="relative group border border-transparent hover:border-slate-100 rounded-lg p-2 md:p-4 -mx-2 md:-mx-4 transition-colors">
                
                <div className="flex items-center justify-between cursor-pointer mb-2 opacity-30 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2 flex-1" onClick={() => atualizarBloco(bloco.id, 'colapsado', !bloco.colapsado)}>
                    <div className="flex items-center gap-1 font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                      {bloco.tipo === 'condutas' && <ListChecks className="w-3 h-3"/>}
                      {bloco.tipo === 'texto_livre' && <Type className="w-3 h-3"/>}
                      {bloco.tipo === 'refeicao' && <Utensils className="w-3 h-3"/>}
                      <span>{bloco.tipo.replace('_', ' ')}</span>
                    </div>
                    {bloco.colapsado && (
                      <span className="ml-2 normal-case font-medium text-slate-500 truncate max-w-[200px] md:max-w-md">
                        - {bloco.tipo === 'refeicao' ? (bloco.nome || 'Refeição sem nome') : (bloco.titulo || 'Conteúdo oculto')}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${bloco.colapsado ? 'rotate-180' : ''}`} />
                  </div>

                  <div className="flex items-center gap-1 bg-white shadow-sm border border-slate-200 rounded-md px-1 py-0.5 z-10" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => moverBloco(index, 'cima')} disabled={index === 0} className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5"/></button>
                    <button type="button" onClick={() => moverBloco(index, 'baixo')} disabled={index === blocos.length - 1} className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5"/></button>
                    <div className="w-px h-3 bg-slate-300 mx-1"></div>
                    <button type="button" onClick={() => removerBloco(bloco.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                </div>

                {!bloco.colapsado && (
                  <>
                    {/* --- TIPO: REFEIÇÃO --- */}
                    {bloco.tipo === 'refeicao' && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <input type="text" value={bloco.nome} onChange={(e) => atualizarBloco(bloco.id, 'nome', e.target.value)} placeholder="Título da Refeição (Ex: Café da Manhã)" className="text-[12pt] font-bold text-black outline-none placeholder-slate-300 flex-1 bg-transparent" />
                          
                          {/* PAINEL DE MACROS AUTOMÁTICO */}
                          {(() => {
                            const macros = calcularTotalMacros(bloco.opcoes?.[0]);
                            if (macros.kcal === '0') return null;
                            return (
                              <div className="flex items-center gap-2 bg-blue-50/60 border border-blue-100 rounded-md px-3 py-1.5 text-[11px] font-mono text-slate-600 shadow-sm shrink-0" title={bloco.opcoes && bloco.opcoes.length > 1 ? "Calculado com base na Opção 1" : "Total de Macros"}>
                                <span>C: <span className="font-bold text-blue-600">{macros.cho}g</span></span>
                                <span className="text-slate-300">|</span>
                                <span>P: <span className="font-bold text-red-500">{macros.ptn}g</span></span>
                                <span className="text-slate-300">|</span>
                                <span>L: <span className="font-bold text-amber-500">{macros.lip}g</span></span>
                                <span className="text-slate-300">|</span>
                                <span className="font-bold text-slate-800">{macros.kcal} kcal</span>
                              </div>
                            );
                          })()}
                        </div>
                        
                        {bloco.mostrarMeta ? (
                          <div className="flex items-center gap-1.5 text-[#0066cc] font-semibold text-[11pt] group/meta relative">
                            <span>META para INSULINA:</span>
                            <input type="text" value={bloco.metaCarboidratos} onChange={(e) => atualizarBloco(bloco.id, 'metaCarboidratos', e.target.value)} placeholder="Ex: até 30g de Carboidratos" className="flex-1 outline-none border-b border-dashed border-transparent hover:border-[#0066cc] bg-transparent placeholder-[#80bfff]" />
                            <button onClick={() => atualizarBloco(bloco.id, 'mostrarMeta', false)} className="opacity-0 group-hover/meta:opacity-100 p-1 text-slate-300 hover:text-red-500" title="Remover linha de meta"><Trash2 className="w-3.5 h-3.5"/></button>
                          </div>
                        ) : (
                          <button onClick={() => { atualizarBloco(bloco.id, 'mostrarMeta', true); if(!bloco.metaCarboidratos) atualizarBloco(bloco.id, 'metaCarboidratos', 'até 30g de Carboidratos'); }} className="text-[9pt] text-[#0066cc] opacity-60 hover:opacity-100 transition-opacity font-semibold flex items-center gap-1 w-max">
                            <Plus className="w-3 h-3"/> Adicionar Meta para Insulina
                          </button>
                        )}

                        <div className="mt-2">
                          {(bloco.opcoes || []).map((opcao, idx) => (
                            <div key={opcao.id} className="relative">
                              {(bloco.opcoes || []).length > 1 ? (
                                <div className="flex items-center justify-between mb-1 mt-4">
                                  <span className="text-[11pt] font-bold text-[#b45309]">Opção {idx + 1}:</span>
                                  <button type="button" onClick={() => removerOpcao(bloco.id, opcao.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              ) : (
                                <div className="text-[11pt] font-bold text-black mb-1 mt-2">Sugestão:</div>
                              )}

                              <div className="flex flex-wrap items-center gap-y-1 gap-x-2">
                                {opcao.itens.map((item, iIndex) => {
                                  const isNovaLinha = iIndex === 0 || item.conexao === 'nova_linha' || !item.conexao;
                                  
                                  // Macro na telinha fantasma respeita a unidade digitada
                                  const calcM = (base?: number) => {
                                    if(!base) return '--';
                                    let bNum = 100;
                                    const mN = (item.porcao_padrao||'100').match(/[\d.,]+/);
                                    if(mN) bNum = parseFloat(mN[0].replace(',','.'));
                                    const qtdNum = parseQtd(item.quantidade);
                                    return ((base * qtdNum) / bNum).toFixed(1);
                                  };

                                  return (
                                    <Fragment key={item.id}>
                                      {isNovaLinha && iIndex > 0 && <div className="w-full basis-full h-0 m-0 p-0" />}

                                      <div className="flex flex-col flex-1 min-w-[280px] relative group/item bg-transparent hover:bg-slate-50 p-1.5 rounded border border-transparent hover:border-slate-200 transition-colors">
                                        <div className="flex items-center gap-1.5 w-full">
                                          <div className="text-slate-300 cursor-move opacity-0 group-hover/item:opacity-100"><GripVertical className="w-4 h-4" /></div>

                                          {iIndex > 0 ? (
                                            <select value={item.conexao || 'nova_linha'} onChange={(e) => atualizarItem(bloco.id, opcao.id, item.id, 'conexao', e.target.value)} className="bg-slate-100 text-emerald-700 font-bold px-1 py-0.5 rounded text-[10px] outline-none cursor-pointer hover:bg-slate-200 transition-colors" title="Alterar conexão">
                                              <option value="nova_linha">↵ Nova Linha</option>
                                              <option value="mais"> + </option>
                                              <option value="ou"> OU </option>
                                            </select>
                                          ) : (
                                            <span className="text-[11pt] font-semibold text-black px-1 opacity-0 pointer-events-none">+</span>
                                          )}

                                          <input type="text" value={item.quantidade} onChange={(e) => atualizarItem(bloco.id, opcao.id, item.id, 'quantidade', e.target.value)} placeholder="Qtd (100g)" className="w-16 px-1 border-b border-dashed border-transparent hover:border-slate-300 focus:border-[#0066cc] bg-transparent outline-none text-[11pt] font-semibold text-black" />
                                          <div className="flex-1 min-w-[120px]">
                                            <BuscaAlimento valorInicial={item.nome} onSelect={(nome, macros, dbId) => {
                                                // Assim que buscar alimento, a gente injeta ele normal, mas ele ainda não tem a porção da base até ele clicar no Lápis e salvar, ou podemos assumir 100g
                                                setBlocos(prev => prev.map(b => b.id === bloco.id && b.tipo === 'refeicao' ? { ...b, opcoes: b.opcoes!.map(o => o.id === opcao.id ? { ...o, itens: o.itens.map(i => i.id === item.id ? { ...i, nome: nome, baseMacros: macros, dbId: dbId, porcao_padrao: '100g' } : i) } : o) } : b))
                                              }} 
                                            />
                                          </div>
                                          
                                          <button type="button" onClick={() => adicionarItem(bloco.id, opcao.id, 'mais', item.id)} className="opacity-0 group-hover/item:opacity-100 p-1 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded transition-all ml-1" title="Adicionar alimento na frente (+)"><Plus className="w-3.5 h-3.5" /></button>
                                          {/* O BOTÃO LÁPIS AGORA BUSCA NO BANCO */}
                                          <button type="button" onClick={() => handleAbrirEdicao(item.dbId, item.nome, item.baseMacros)} className="p-1 text-slate-300 hover:text-emerald-600 opacity-0 group-hover/item:opacity-100 transition-opacity"><Pencil className="w-3.5 h-3.5" /></button>
                                          <button type="button" onClick={() => removerItem(bloco.id, opcao.id, item.id)} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>

                                        <div className="flex items-center pl-7 gap-2 opacity-20 focus-within:opacity-100 hover:opacity-100 transition-opacity mt-0.5">
                                          <div className="flex items-center gap-1.5">
                                            <button type="button" onClick={() => toggleMacroAtivo(bloco.id, opcao.id, item.id, item.macroAtivo === 'cho' ? null : 'cho')} className={`px-1.5 py-0.5 text-[10px] font-mono border rounded ${item.macroAtivo === 'cho' ? 'bg-[#0066cc]/10 border-[#0066cc]/30 text-[#0066cc]' : 'bg-transparent border-slate-200 text-slate-400'}`}>C: {calcM(item.baseMacros?.cho)}</button>
                                            <button type="button" onClick={() => toggleMacroAtivo(bloco.id, opcao.id, item.id, item.macroAtivo === 'ptn' ? null : 'ptn')} className={`px-1.5 py-0.5 text-[10px] font-mono border rounded ${item.macroAtivo === 'ptn' ? 'bg-[#0066cc]/10 border-[#0066cc]/30 text-[#0066cc]' : 'bg-transparent border-slate-200 text-slate-400'}`}>P: {calcM(item.baseMacros?.ptn)}</button>
                                            <button type="button" onClick={() => toggleMacroAtivo(bloco.id, opcao.id, item.id, item.macroAtivo === 'lip' ? null : 'lip')} className={`px-1.5 py-0.5 text-[10px] font-mono border rounded ${item.macroAtivo === 'lip' ? 'bg-[#0066cc]/10 border-[#0066cc]/30 text-[#0066cc]' : 'bg-transparent border-slate-200 text-slate-400'}`}>L: {calcM(item.baseMacros?.lip)}</button>
                                          </div>
                                          {item.macroAtivo && (
                                            <div className="flex items-center gap-1 bg-[#0066cc]/5 px-2 py-0.5 rounded border border-[#0066cc]/20">
                                              <Target className="w-3 h-3 text-[#0066cc]" />
                                              <span className="text-[10px] font-semibold text-[#0066cc]">Alvo {item.macroAtivo.toUpperCase()} (g):</span>
                                              <input type="number" value={item.macroAlvo || ''} onChange={(e) => atualizarAlvoMacro(bloco.id, opcao.id, item.id, e.target.value)} className="w-10 text-[10px] font-mono bg-transparent border-b border-dashed border-[#0066cc]/50 outline-none text-center" />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </Fragment>
                                  );
                                })}
                              </div>
                              
                              <button type="button" onClick={() => adicionarItem(bloco.id, opcao.id, 'nova_linha')} className="text-emerald-600/50 hover:text-emerald-600 font-medium text-[9pt] flex items-center gap-1 pl-3 mt-1 mb-2 transition-colors"><Plus className="w-3.5 h-3.5" /> Adicionar nova linha de alimento abaixo</button>
                            </div>
                          ))}
                          <button type="button" onClick={() => adicionarOpcao(bloco.id)} className="text-slate-400 text-[10pt] font-medium hover:text-emerald-600 transition flex items-center gap-1 mt-3"><Plus className="w-3.5 h-3.5"/> Adicionar Opção (Substituição Inteira)</button>
                        </div>

                        <div className="mt-4">
                          <textarea value={bloco.conteudoTexto} onChange={(e) => handleTextareaResize(e, bloco.id)} placeholder="Adicionar recado livre logo abaixo dessa refeição (Opcional)" rows={1} className="w-full mt-1 outline-none text-[11pt] text-black resize-none overflow-hidden bg-transparent leading-relaxed border-l border-dashed border-slate-200 hover:border-slate-300 pl-3 py-1 transition-colors" />
                        </div>
                      </div>
                    )}

                    {/* --- TIPO: TEXTO LIVRE --- */}
                    {bloco.tipo === 'texto_livre' && (
                      <div className="flex flex-col gap-1.5 mt-2">
                        <input type="text" value={bloco.titulo} onChange={(e) => atualizarBloco(bloco.id, 'titulo', e.target.value)} placeholder="Subtítulo (Ex: Lanches da Tarde)" className="text-[12pt] font-bold text-[#b45309] outline-none placeholder-slate-300 w-full bg-transparent" />
                        <textarea value={bloco.conteudoTexto} onChange={(e) => handleTextareaResize(e, bloco.id)} placeholder="Digite o conteúdo livre aqui..." rows={3} className="w-full mt-1 outline-none text-[11pt] text-black resize-none overflow-hidden bg-transparent leading-relaxed border-l border-dashed border-slate-200 hover:border-slate-300 pl-3 py-1 transition-colors" />
                      </div>
                    )}

                    {/* --- TIPO: CONDUTAS --- */}
                    {bloco.tipo === 'condutas' && (
                      <div className="flex flex-col gap-1.5 mt-2">
                        <p className="text-[12pt] font-bold text-[#b45309]">Orientações / Condutas</p>
                        <textarea value={bloco.conteudoTexto} onChange={(e) => handleTextareaResize(e, bloco.id)} placeholder="Digite as condutas aqui ou selecione no menu de atalhos abaixo..." rows={4} className="w-full mt-1 outline-none text-[11pt] text-black resize-none overflow-hidden bg-slate-50 focus:bg-white border border-transparent focus:border-slate-200 p-2 rounded leading-relaxed" />
                        
                        <button type="button" onClick={() => atualizarBloco(bloco.id, 'expandido', !bloco.expandido)} className="mt-2 flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded text-sm text-slate-600 font-medium">
                          <span>Atalhos de Condutas do Banco</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${bloco.expandido ? 'rotate-180' : ''}`} />
                        </button>
                        {bloco.expandido && (
                          <div className="mt-2 p-4 bg-slate-50 rounded border border-slate-200 text-sm">
                            {Object.entries(configsPorCategoria).map(([categoria, configs]) => (
                              <div key={categoria} className="mb-3 last:mb-0">
                                <h4 className="font-bold text-slate-800 mb-1">{categoria}</h4>
                                {configs.map((config) => (
                                  <label key={config.id} className="flex items-start gap-2 cursor-pointer hover:bg-white p-1 rounded">
                                    <input type="checkbox" checked={bloco.conteudoTexto.includes(config.conteudo)} onChange={(e) => toggleCondutaBloco(bloco.id, config.conteudo, e.target.checked)} className="mt-1" />
                                    <span className="text-slate-700">{config.titulo}</span>
                                  </label>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-dashed border-slate-300 flex flex-wrap gap-3">
            <button type="button" onClick={() => adicionarBloco('refeicao')} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-medium transition text-sm"><Plus className="w-4 h-4"/> Adicionar Refeição</button>
            <button type="button" onClick={() => adicionarBloco('texto_livre')} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-medium transition text-sm"><AlignLeft className="w-4 h-4"/> Parágrafo Livre</button>
            <button type="button" onClick={() => adicionarBloco('condutas')} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-medium transition text-sm"><ListChecks className="w-4 h-4"/> Bloco de Condutas</button>
          </div>
        </div>

        {/* TABELAS DE EQUIVALENTES */}
        <div className="max-w-4xl mx-auto bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-10">
          <div className="bg-slate-50 px-8 py-5 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setTabelasColapsadas(!tabelasColapsadas)}>
            <h2 className="text-lg font-bold text-slate-800">Anexar Tabelas de Equivalentes Automáticas no PDF</h2>
            <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${tabelasColapsadas ? 'rotate-180' : ''}`} />
          </div>

          {!tabelasColapsadas && (
            <div className="p-8 space-y-4 border-t border-slate-200">
              <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <div className="p-4 flex items-center gap-4 border-b border-slate-200 bg-white">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input type="checkbox" checked={tabelasSelecionadas.proteinas} onChange={() => toggleTabela('proteinas')} className="w-5 h-5 text-emerald-600 rounded" />
                    <span className="font-bold text-slate-800">Tabela 1: Proteínas Animais</span>
                  </label>
                  {tabelasSelecionadas.proteinas && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-amber-700">Alvo PTN (g):</span>
                      <input type="number" value={alvosTabelas.proteinas} onChange={(e) => setAlvosTabelas({ ...alvosTabelas, proteinas: e.target.value })} placeholder="Ex: 20" className="w-20 px-2 py-1 border border-slate-300 rounded text-sm outline-none focus:border-emerald-500" />
                    </div>
                  )}
                </div>
                {tabelasSelecionadas.proteinas && (
                  <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                    {tabelaProteinas.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                        <BuscaAlimento valorInicial={item.nome} onSelect={(nome, macros, dbId) => atualizarItemTabela('proteinas', item.id, nome, macros, dbId)} />
                        <div className="w-24 text-sm font-bold text-slate-700 bg-slate-100 border border-slate-200 py-1.5 text-center rounded">{calcularPesoEquivalente(alvosTabelas.proteinas, item.baseMacro, item.porcao_padrao)}</div>
                        <button type="button" onClick={() => handleAbrirEdicao(item.dbId, item.nome, item.macrosReal)} className="p-1.5 text-slate-400 hover:text-emerald-600"><Pencil className="w-4 h-4" /></button>
                        <button type="button" onClick={() => removerItemTabela('proteinas', item.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => adicionarItemTabela('proteinas')} className="text-emerald-600 text-sm font-semibold flex items-center gap-1 mt-2 hover:underline"><Plus className="w-4 h-4"/> Adicionar Linha</button>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <div className="p-4 flex items-center gap-4 border-b border-slate-200 bg-white">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input type="checkbox" checked={tabelasSelecionadas.substitutosArroz} onChange={() => toggleTabela('substitutosArroz')} className="w-5 h-5 text-emerald-600 rounded" />
                    <span className="font-bold text-slate-800">Tabela 2: Substitutos de Arroz</span>
                  </label>
                  {tabelasSelecionadas.substitutosArroz && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-700">Alvo CHO (g):</span>
                      <input type="number" value={alvosTabelas.substitutosArroz} onChange={(e) => setAlvosTabelas({ ...alvosTabelas, substitutosArroz: e.target.value })} placeholder="Ex: 30" className="w-20 px-2 py-1 border border-slate-300 rounded text-sm outline-none focus:border-emerald-500" />
                    </div>
                  )}
                </div>
                {tabelasSelecionadas.substitutosArroz && (
                  <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                    {tabelaArroz.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                        <BuscaAlimento valorInicial={item.nome} onSelect={(nome, macros, dbId) => atualizarItemTabela('arroz', item.id, nome, macros, dbId)} />
                        <div className="w-24 text-sm font-bold text-slate-700 bg-slate-100 border border-slate-200 py-1.5 text-center rounded">{calcularPesoEquivalente(alvosTabelas.substitutosArroz, item.baseMacro, item.porcao_padrao)}</div>
                        <button type="button" onClick={() => handleAbrirEdicao(item.dbId, item.nome, item.macrosReal)} className="p-1.5 text-slate-400 hover:text-emerald-600"><Pencil className="w-4 h-4" /></button>
                        <button type="button" onClick={() => removerItemTabela('arroz', item.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => adicionarItemTabela('arroz')} className="text-emerald-600 text-sm font-semibold flex items-center gap-1 mt-2 hover:underline"><Plus className="w-4 h-4"/> Adicionar Linha</button>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <div className="p-4 flex items-center gap-4 border-b border-slate-200 bg-white">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input type="checkbox" checked={tabelasSelecionadas.frutas} onChange={() => toggleTabela('frutas')} className="w-5 h-5 text-emerald-600 rounded" />
                    <span className="font-bold text-slate-800">Tabela 3: Frutas</span>
                  </label>
                  {tabelasSelecionadas.frutas && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-700">Alvo CHO (g):</span>
                      <input type="number" value={alvosTabelas.frutas} onChange={(e) => setAlvosTabelas({ ...alvosTabelas, frutas: e.target.value })} placeholder="Ex: 15" className="w-20 px-2 py-1 border border-slate-300 rounded text-sm outline-none focus:border-emerald-500" />
                    </div>
                  )}
                </div>
                {tabelasSelecionadas.frutas && (
                  <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                    {tabelaFrutas.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                        <BuscaAlimento valorInicial={item.nome} onSelect={(nome, macros, dbId) => atualizarItemTabela('frutas', item.id, nome, macros, dbId)} />
                        <div className="w-24 text-sm font-bold text-slate-700 bg-slate-100 border border-slate-200 py-1.5 text-center rounded">{calcularPesoEquivalente(alvosTabelas.frutas, item.baseMacro, item.porcao_padrao)}</div>
                        <button type="button" onClick={() => handleAbrirEdicao(item.dbId, item.nome, item.macrosReal)} className="p-1.5 text-slate-400 hover:text-emerald-600"><Pencil className="w-4 h-4" /></button>
                        <button type="button" onClick={() => removerItemTabela('frutas', item.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => adicionarItemTabela('frutas')} className="text-emerald-600 text-sm font-semibold flex items-center gap-1 mt-2 hover:underline"><Plus className="w-4 h-4"/> Adicionar Linha</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
          ÁREA DE IMPRESSÃO NATIVA (Ctrl+P do Navegador)
          ========================================================= */}
      <div id="print-area" className="hidden print:table w-full bg-white text-black font-sans text-[11pt]">
        <thead className="table-header-group">
          <tr>
            <td>
              <div className="relative mb-6 pb-4 pt-4">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-[14pt] text-[#1e3a8a] font-normal tracking-wide">Nutrição e Educação em Diabetes</p>
                    <p className="text-[14pt] text-[#1e3a8a] mt-1">Paciente: <span className="font-bold">{metadados.pacienteNome || '___________________'}</span></p>
                  </div>
                  <img src="/logo.jpg" alt="Logo" className="w-36 h-36 object-contain" />
                </div>
                
                <hr className="border-t border-dashed border-black my-4 w-full" />
                
                <p className="text-[11pt] text-[#1e3a8a]">Carolina Macedo - Nutricionista (CRN 29096) e Educadora em Diabetes | (19) 98314-1909</p>
                <p className="text-[11pt] text-blue-600 underline">www.carolinaminhanutri.com</p>
                <p className="text-[11pt] text-[#1e3a8a] mt-1">Data: {metadados.dataPrescricao}</p>
                <p className="text-[12pt] font-bold underline mt-6 mb-2">Distribuição dos carboidratos por refeição:</p>
              </div>
            </td>
          </tr>
        </thead>

        <tbody className="table-row-group" id="print-body">
          <tr>
            <td>
              <div className="space-y-6">
                {blocos.map((bloco) => {
                  if (bloco.tipo === 'condutas' && bloco.conteudoTexto?.trim()) {
                    return (
                      <div key={bloco.id} className="break-inside-avoid">
                        <p className="font-bold text-[12pt] text-[#b45309] mb-1">Orientações Gerais</p>
                        <div className="text-[11pt] whitespace-pre-line text-black leading-relaxed">{bloco.conteudoTexto}</div>
                      </div>
                    );
                  }

                  if (bloco.tipo === 'texto_livre' && (bloco.titulo || bloco.conteudoTexto?.trim())) {
                    return (
                      <div key={bloco.id} className="break-inside-avoid">
                        {bloco.titulo && <p className="font-bold text-[12pt] text-[#b45309] mb-1">{bloco.titulo}</p>}
                        <div className="text-[11pt] whitespace-pre-line text-black leading-relaxed">{bloco.conteudoTexto}</div>
                      </div>
                    );
                  }

                  if (bloco.tipo === 'refeicao') {
                    const temOpcoes = (bloco.opcoes || []).some((o) => o.itens.some((i) => i.nome || i.quantidade));
                    if (!temOpcoes && !bloco.conteudoTexto?.trim()) return null;

                    return (
                      <div key={bloco.id} className="break-inside-avoid mb-6">
                        {bloco.nome && <p className="font-bold text-[12pt] text-black">{bloco.nome}</p>}
                        
                        {bloco.mostrarMeta && bloco.metaCarboidratos && (
                          <p className="text-[11pt] font-semibold text-[#0066cc]">META para INSULINA: {bloco.metaCarboidratos}</p>
                        )}
                        
                        {(bloco.opcoes || []).map((opcao, idx) => {
                          const temItemPreenchido = opcao.itens.some((i) => i.nome || i.quantidade);
                          if (!temItemPreenchido) return null;

                          const linhasPdf: ItemAlimento[][] = [];
                          let curLinhaPdf: ItemAlimento[] = [];
                          opcao.itens.forEach((item, i) => {
                            if (i === 0 || item.conexao === 'nova_linha' || !item.conexao) {
                              if (curLinhaPdf.length > 0) linhasPdf.push(curLinhaPdf);
                              curLinhaPdf = [item];
                            } else curLinhaPdf.push(item);
                          });
                          if (curLinhaPdf.length > 0) linhasPdf.push(curLinhaPdf);

                          return (
                            <div key={opcao.id} className="mt-2">
                              {bloco.opcoes!.length > 1 ? (
                                <p className="font-bold text-[#b45309] text-[11pt] mb-1">Opção {idx + 1}:</p>
                              ) : (
                                <p className="font-bold text-black text-[11pt] mb-1">Sugestão:</p>
                              )}
                              <div className="text-[11pt] text-black leading-relaxed">
                                {linhasPdf.map((linha, lIdx) => (
                                  <div key={lIdx} className="mb-1">
                                    {lIdx > 0 ? '+ ' : ''}
                                    {linha.map((item, iIdx) => {
                                        const qtd = item.quantidade ? <span className="font-semibold">{item.quantidade} </span> : null;
                                        const con = iIdx > 0 ? (item.conexao === 'ou' ? ' OU ' : ' + ') : '';
                                        return (
                                          <span key={item.id}>
                                            {iIdx > 0 && <span className="font-bold mx-1">{con}</span>}
                                            {qtd}{item.nome}
                                          </span>
                                        );
                                    })}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        {bloco.conteudoTexto?.trim() && (
                          <div className="mt-2 text-[11pt] whitespace-pre-line text-black leading-relaxed">
                            {bloco.conteudoTexto}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              {/* TABELAS DE EQUIVALENTES (Impressão) */}
              {(tabelasSelecionadas.proteinas || tabelasSelecionadas.substitutosArroz || tabelasSelecionadas.frutas) && (
                <div className="mt-10 break-before-auto">
                  {tabelasSelecionadas.proteinas && alvosTabelas.proteinas && (
                    <div className="mb-8 break-inside-avoid">
                      <p className="font-bold text-[#1e3a8a] text-[12pt] mb-2">Tabela 1: aprox. {alvosTabelas.proteinas}g de Proteína Animal (Pronto)</p>
                      <table className="w-full border-collapse border border-black text-[10.5pt]">
                        <thead><tr><th className="border border-black text-left px-3 py-1 font-bold">Opção</th><th className="border border-black text-left px-3 py-1 font-bold w-1/3">Quantidade / Peso</th></tr></thead>
                        <tbody>
                          {tabelaProteinas.map((item, idx) => item.nome ? (
                            <tr key={idx}><td className="border border-black px-3 py-1">{item.nome}</td><td className="border border-black px-3 py-1">{calcularPesoEquivalente(alvosTabelas.proteinas, item.baseMacro, item.porcao_padrao)}</td></tr>
                          ) : null)}
                          <tr><td className="border border-black px-3 py-1">Ovos</td><td className="border border-black px-3 py-1 italic">Ajustar (1 ovo = ~6g ptn)</td></tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {tabelasSelecionadas.substitutosArroz && alvosTabelas.substitutosArroz && (
                    <div className="mb-8 break-inside-avoid">
                      <p className="font-bold text-[#1e3a8a] text-[12pt] mb-2">Tabela 2: Substitutos de Arroz (aprox. {alvosTabelas.substitutosArroz}g Carboidratos)</p>
                      <table className="w-full border-collapse border border-black text-[10.5pt]">
                        <thead><tr><th className="border border-black text-left px-3 py-1 font-bold">Alimento</th><th className="border border-black text-left px-3 py-1 font-bold w-1/3">Quantidade Equivalente</th></tr></thead>
                        <tbody>
                          {tabelaArroz.map((item, idx) => item.nome ? (
                            <tr key={idx}><td className="border border-black px-3 py-1">{item.nome}</td><td className="border border-black px-3 py-1">{calcularPesoEquivalente(alvosTabelas.substitutosArroz, item.baseMacro, item.porcao_padrao)}</td></tr>
                          ) : null)}
                        </tbody>
                      </table>
                      <p className="text-[10pt] mt-1 font-bold text-gray-800">Feijão: as mesmas quantidades para ervilha, lentilha ou grão-de-bico (60g)</p>
                    </div>
                  )}

                  {tabelasSelecionadas.frutas && alvosTabelas.frutas && (
                    <div className="mb-8 break-inside-avoid">
                      <p className="font-bold text-[#1e3a8a] text-[12pt] mb-2">Tabela 3: Frutas (1 porção ≈ {alvosTabelas.frutas}g Carboidratos)</p>
                      <table className="w-full border-collapse border border-black text-[10.5pt]">
                        <thead><tr><th className="border border-black text-left px-3 py-1 font-bold">Fruta</th><th className="border border-black text-left px-3 py-1 font-bold w-1/3">Peso / Quantidade</th></tr></thead>
                        <tbody>
                          {tabelaFrutas.map((item, idx) => item.nome ? (
                            <tr key={idx}><td className="border border-black px-3 py-1">{item.nome}</td><td className="border border-black px-3 py-1">{calcularPesoEquivalente(alvosTabelas.frutas, item.baseMacro, item.porcao_padrao)}</td></tr>
                          ) : null)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </div>

      {/* RODAPÉ FIXO NA IMPRESSÃO NATIVA */}
      <div className="hidden print:flex fixed bottom-0 left-0 w-full bg-white flex-col items-center justify-center pt-2 pb-2 z-50 border-t border-slate-200">
        <p className="text-[10pt] text-black">Carolina de Souza Silva Macedo - Nutricionista e Educadora em Diabetes - CRN 29096</p>
        <div className="flex items-center gap-4 mt-1 text-[10pt] text-[#0066cc]">
          <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5 text-black" /> (19) 98314-1909</span>
          <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-black" /> carolinamacedo.nutri@gmail.com</span>
          <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-black" /> www.carolinaminhanutri.com</span>
        </div>
      </div>

      {/* MODAL DE ASSINATURA */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold flex items-center gap-2"><FileSignature className="w-5 h-5 text-blue-600" /> Assinatura</h3>
              <button onClick={() => !isSigning && setIsSignModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              {signError && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border">{signError}</div>}
              <div><label className="block text-sm font-semibold mb-2">1. Certificado (.pfx)</label><input type="file" accept=".pfx,.p12" onChange={(e) => setCertFile(e.target.files ? e.target.files[0] : null)} disabled={isSigning} className="w-full text-sm" /></div>
              <div><label className="block text-sm font-semibold mb-2">2. Senha</label><input type="password" value={certPassword} onChange={(e) => setCertPassword(e.target.value)} disabled={isSigning} className="w-full px-4 py-2 border rounded-lg" /></div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
              <button onClick={() => setIsSignModalOpen(false)} disabled={isSigning} className="px-4 py-2 font-medium">Cancelar</button>
              <button onClick={handleAssinar} disabled={isSigning} className="px-6 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">{isSigning ? <><Loader2 className="w-4 h-4 animate-spin" /> Assinando...</> : 'Assinar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE ALIMENTO COM PORÇÃO */}
      {modalEdicao.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">Refinar Alimento</h3>
              <button onClick={() => setModalEdicao({ ...modalEdicao, isOpen: false })}><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nome do Alimento</label>
                <input type="text" value={modalEdicao.nome} onChange={e => setModalEdicao({...modalEdicao, nome: e.target.value})} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-emerald-700">Porção Base / Padrão</label>
                <input type="text" value={modalEdicao.porcao} onChange={e => setModalEdicao({...modalEdicao, porcao: e.target.value})} placeholder="Ex: 100g, 1 unidade, 200ml" className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50 rounded" />
                <p className="text-[10px] text-slate-500 mt-1">Os macros abaixo devem ser equivalentes a esta porção exata.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div><label className="block text-xs font-semibold mb-1">CHO (g)</label><input type="number" value={modalEdicao.cho} onChange={e => setModalEdicao({...modalEdicao, cho: e.target.value})} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-xs font-semibold mb-1">PTN (g)</label><input type="number" value={modalEdicao.ptn} onChange={e => setModalEdicao({...modalEdicao, ptn: e.target.value})} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-xs font-semibold mb-1">LIP (g)</label><input type="number" value={modalEdicao.lip} onChange={e => setModalEdicao({...modalEdicao, lip: e.target.value})} className="w-full px-3 py-2 border rounded" /></div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t">
              <button onClick={() => setModalEdicao({ ...modalEdicao, isOpen: false })} className="px-4 py-2 font-medium text-slate-600">Cancelar</button>
              <button onClick={handleAtualizarAlimento} disabled={salvandoAlimento || !modalEdicao.nome.trim()} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium">{salvandoAlimento ? 'Salvando...' : 'Salvar no Banco'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function CriarPrescricaoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mr-2"/> Carregando editor...</div>}>
      <PrescricaoEditor />
    </Suspense>
  );
}