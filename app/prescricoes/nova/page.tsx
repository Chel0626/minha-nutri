'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { usePacientes, usePreConfiguracoes } from '@/hooks/useDatabase';
import { Paciente, PreConfiguracao } from '@/types/database.types';
import { ChevronDown, Plus, Trash2, Check, GripVertical, Target, Printer, FileSignature, X, Loader2, Pencil, ArrowUp, ArrowDown, Type, ListChecks, Utensils } from 'lucide-react';
import BuscaAlimento from '@/components/BuscaAlimento';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ItemAlimento {
  id: string;
  dbId?: string;
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

type TipoBloco = 'condutas' | 'refeicao' | 'texto_livre';

interface Bloco {
  id: string;
  tipo: TipoBloco;
  nome?: string;
  metaCarboidratos?: string;
  metaProteinas?: string;
  opcoes?: Opcao[];
  observacoes?: string;
  expandido?: boolean;
  colapsado?: boolean;
  titulo?: string;
  conteudoTexto?: string;
}

interface ItemTabela {
  id: string;
  dbId?: string;
  nome: string;
  baseMacro: number;
  macrosReal?: { cho: number; ptn: number; lip: number };
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
  { nome: 'Lombo suíno (assado)', base: 35.7 }
];

const TABELA_ARROZ = [
  { nome: 'Batata Doce (cozida)', base: 18.4 },
  { nome: 'Batata Inglesa / Purê', base: 11.9 },
  { nome: 'Cará (cozido)', base: 18.9 },
  { nome: 'Inhame (cozido)', base: 23.5 },
  { nome: 'Mandioca (cozida)', base: 30.1 },
  { nome: 'Mandioquinha (cozida)', base: 18.9 },
  { nome: 'Milho-verde (enlatado)', base: 17.1 }
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
  { nome: 'Uva', base: 17.3 }
];

export default function CriarPrescricao() {
  const { pacientes, loading: loadingPacientes } = usePacientes();
  const { preConfigs, loading: loadingConfigs } = usePreConfiguracoes();

  const [metadadosColapsado, setMetadadosColapsado] = useState(false);
  const [tabelasColapsadas, setTabelasColapsadas] = useState(true);

  const [metadados, setMetadados] = useState<MetadadosPrescricion>({
    pacienteId: '',
    pacienteNome: '',
    faseCaloricas: '',
    dataPrescricao: new Date().toISOString().split('T')[0],
  });

  const [blocos, setBlocos] = useState<Bloco[]>([
    {
      id: `cond-${Date.now()}`,
      tipo: 'condutas',
      conteudoTexto: '',
      expandido: false,
      colapsado: false,
    },
    {
      id: `ref-${Date.now()}`,
      tipo: 'refeicao',
      nome: 'Café da Manhã',
      metaCarboidratos: '',
      metaProteinas: '',
      opcoes: [{ id: `op-${Date.now()}`, itens: [{ id: `it-${Date.now()}`, quantidade: '', nome: '' }] }],
      observacoes: '',
      expandido: false,
      colapsado: false,
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
    frutas: ''
  });

  const [tabelaProteinas, setTabelaProteinas] = useState<ItemTabela[]>(
    TABELA_PROTEINAS.map((t, i) => ({ id: `tp-${i}`, nome: t.nome, baseMacro: t.base, macrosReal: { cho: 0, ptn: t.base, lip: 0 } }))
  );
  const [tabelaArroz, setTabelaArroz] = useState<ItemTabela[]>(
    TABELA_ARROZ.map((t, i) => ({ id: `ta-${i}`, nome: t.nome, baseMacro: t.base, macrosReal: { cho: t.base, ptn: 0, lip: 0 } }))
  );
  const [tabelaFrutas, setTabelaFrutas] = useState<ItemTabela[]>(
    TABELA_FRUTAS.map((t, i) => ({ id: `tf-${i}`, nome: t.nome, baseMacro: t.base, macrosReal: { cho: t.base, ptn: 0, lip: 0 } }))
  );

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalEdicao, setModalEdicao] = useState({ isOpen: false, id: '', nome: '', cho: '', ptn: '', lip: '' });
  const [salvandoAlimento, setSalvandoAlimento] = useState(false);

  const caloriasCalculadas = 
    (parseFloat(modalEdicao.cho) || 0) * 4 + 
    (parseFloat(modalEdicao.ptn) || 0) * 4 + 
    (parseFloat(modalEdicao.lip) || 0) * 9;

  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const configsPorCategoria = preConfigs.reduce(
    (acc, config: PreConfiguracao) => {
      if (!acc[config.categoria]) acc[config.categoria] = [];
      acc[config.categoria].push(config);
      return acc;
    },
    {} as Record<string, PreConfiguracao[]>
  );

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

  const adicionarBloco = (tipo: TipoBloco) => {
    const novoBloco: Bloco = { id: `${tipo}-${Date.now()}`, tipo, colapsado: false };
    if (tipo === 'refeicao') {
      novoBloco.nome = '';
      novoBloco.metaCarboidratos = '';
      novoBloco.metaProteinas = '';
      novoBloco.opcoes = [{ id: `op-${Date.now()}`, itens: [{ id: `it-${Date.now()}`, quantidade: '', nome: '' }] }];
      novoBloco.observacoes = '';
    } else if (tipo === 'texto_livre') {
      novoBloco.titulo = 'Título da Sessão';
      novoBloco.conteudoTexto = '';
    } else if (tipo === 'condutas') {
      novoBloco.conteudoTexto = '';
      novoBloco.expandido = false;
    }
    setBlocos([...blocos, novoBloco]);
  };

  const removerBloco = (id: string) => {
    setBlocos(blocos.filter(b => b.id !== id));
  };

  const moverBloco = (index: number, direcao: 'cima' | 'baixo') => {
    if (direcao === 'cima' && index === 0) return;
    if (direcao === 'baixo' && index === blocos.length - 1) return;
    const novosBlocos = [...blocos];
    const alvo = direcao === 'cima' ? index - 1 : index + 1;
    [novosBlocos[index], novosBlocos[alvo]] = [novosBlocos[alvo], novosBlocos[index]];
    setBlocos(novosBlocos);
  };

  const atualizarBloco = (id: string, campo: keyof Bloco, valor: any) => {
    setBlocos(blocos.map(b => (b.id === id ? { ...b, [campo]: valor } : b)));
  };

  const toggleCondutaBloco = (blocoId: string, conteudo: string, checked: boolean) => {
    setBlocos(blocos.map(b => {
      if (b.id === blocoId && b.tipo === 'condutas') {
        let novoTexto = b.conteudoTexto || '';
        if (checked) {
          if (!novoTexto.includes(conteudo)) novoTexto = novoTexto ? `${novoTexto}\n\n${conteudo}` : conteudo;
        } else {
          novoTexto = novoTexto.replace(`\n\n${conteudo}`, '').replace(`${conteudo}\n\n`, '').replace(conteudo, '');
        }
        return { ...b, conteudoTexto: novoTexto.trim() };
      }
      return b;
    }));
  };

  const adicionarOpcao = (blocoId: string) => {
    setBlocos(blocos.map((b) => {
      if (b.id === blocoId && b.tipo === 'refeicao') {
        return { ...b, opcoes: [...(b.opcoes || []), { id: `op-${Date.now()}`, itens: [{ id: `it-${Date.now()}`, quantidade: '', nome: '' }] }] };
      }
      return b;
    }));
  };

  const removerOpcao = (blocoId: string, opcaoId: string) => {
    setBlocos(blocos.map((b) => {
      if (b.id === blocoId && b.tipo === 'refeicao') {
        return { ...b, opcoes: (b.opcoes || []).filter((o) => o.id !== opcaoId) };
      }
      return b;
    }));
  };

  const adicionarItem = (blocoId: string, opcaoId: string) => {
    setBlocos(blocos.map((b) => {
      if (b.id === blocoId && b.tipo === 'refeicao') {
        return {
          ...b,
          opcoes: (b.opcoes || []).map((o) => o.id === opcaoId ? { ...o, itens: [...o.itens, { id: `it-${Date.now()}`, quantidade: '', nome: '' }] } : o),
        };
      }
      return b;
    }));
  };

  const removerItem = (blocoId: string, opcaoId: string, itemId: string) => {
    setBlocos(blocos.map((b) => {
      if (b.id === blocoId && b.tipo === 'refeicao') {
        return {
          ...b,
          opcoes: (b.opcoes || []).map((o) => o.id === opcaoId ? { ...o, itens: o.itens.filter((i) => i.id !== itemId) } : o),
        };
      }
      return b;
    }));
  };

  const atualizarItem = (blocoId: string, opcaoId: string, itemId: string, campo: keyof ItemAlimento, valor: any) => {
    setBlocos(blocos.map((b) => {
      if (b.id === blocoId && b.tipo === 'refeicao') {
        return {
          ...b,
          opcoes: (b.opcoes || []).map((o) => {
            if (o.id === opcaoId) {
              return { ...o, itens: o.itens.map((i) => i.id === itemId ? { ...i, [campo]: valor } : i) };
            }
            return o;
          }),
        };
      }
      return b;
    }));
  };

  const toggleMacroAtivo = (blocoId: string, opcaoId: string, itemId: string, macro: 'cho' | 'ptn' | 'lip' | null) => {
    setBlocos(blocos.map((b) =>
      b.id === blocoId && b.tipo === 'refeicao'
        ? {
            ...b,
            opcoes: (b.opcoes || []).map((o) =>
              o.id === opcaoId
                ? { ...o, itens: o.itens.map((i) => i.id === itemId ? { ...i, macroAtivo: macro, macroAlvo: '' } : i) }
                : o
            ),
          }
        : b
    ));
  };

  const atualizarAlvoMacro = (blocoId: string, opcaoId: string, itemId: string, valor: string) => {
    setBlocos(blocos.map((b) => {
      if (b.id !== blocoId || b.tipo !== 'refeicao') return b;
      return {
        ...b,
        opcoes: (b.opcoes || []).map((o) => {
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
    }));
  };

  const toggleTabela = (tabela: 'proteinas' | 'substitutosArroz' | 'frutas') => {
    setTabelasSelecionadas({ ...tabelasSelecionadas, [tabela]: !tabelasSelecionadas[tabela] });
  };

  const adicionarItemTabela = (tabela: 'proteinas' | 'arroz' | 'frutas') => {
    const newItem = { id: `tab-${Date.now()}`, nome: '', baseMacro: 0 };
    if (tabela === 'proteinas') setTabelaProteinas([...tabelaProteinas, newItem]);
    if (tabela === 'arroz') setTabelaArroz([...tabelaArroz, newItem]);
    if (tabela === 'frutas') setTabelaFrutas([...tabelaFrutas, newItem]);
  };

  const removerItemTabela = (tabela: 'proteinas' | 'arroz' | 'frutas', id: string) => {
    if (tabela === 'proteinas') setTabelaProteinas(prev => prev.filter(i => i.id !== id));
    if (tabela === 'arroz') setTabelaArroz(prev => prev.filter(i => i.id !== id));
    if (tabela === 'frutas') setTabelaFrutas(prev => prev.filter(i => i.id !== id));
  };

  const atualizarItemTabela = (
    tabela: 'proteinas' | 'arroz' | 'frutas',
    id: string,
    nome: string,
    macros: { cho: number, ptn: number, lip: number },
    dbId?: string
  ) => {
    const baseMacro = tabela === 'proteinas' ? macros.ptn : macros.cho;
    const updateFn = (prev: ItemTabela[]) => prev.map(i => i.id === id ? { ...i, nome, baseMacro, macrosReal: macros, dbId } : i);

    if (tabela === 'proteinas') setTabelaProteinas(updateFn);
    else if (tabela === 'arroz') setTabelaArroz(updateFn);
    else if (tabela === 'frutas') setTabelaFrutas(updateFn);
  };

  const calcularPesoEquivalente = (alvo: string, baseMacro: number) => {
    const alvoNum = parseFloat(alvo);
    if (isNaN(alvoNum) || baseMacro === 0) return '--';
    const pesoExato = (alvoNum * 100) / baseMacro;
    return `${Math.round(pesoExato / 5) * 5}g`;
  };

  const handleAtualizarAlimento = async () => {
    if (!modalEdicao.nome.trim()) {
      alert("O nome do alimento não pode estar vazio.");
      return;
    }
    setSalvandoAlimento(true);

    try {
      const dadosSalvar = {
        nome_exibicao: modalEdicao.nome,
        cho: parseFloat(modalEdicao.cho) || 0,
        ptn: parseFloat(modalEdicao.ptn) || 0,
        lip: parseFloat(modalEdicao.lip) || 0,
        kcal: caloriasCalculadas
      };

      if (modalEdicao.id) {
        const { error } = await supabase.from('alimentos').update(dadosSalvar).eq('id', modalEdicao.id);
        if (error) throw error;
      } else {
        const novoId = `custom_${Date.now()}`;
        const { error } = await supabase.from('alimentos').insert([{ id: novoId, ...dadosSalvar }]);
        if (error) throw error;
      }

      setModalEdicao({ isOpen: false, id: '', nome: '', cho: '', ptn: '', lip: '' });
    } catch (err) {
      console.error("Erro ao atualizar alimento:", err);
      alert("Erro ao salvar o alimento.");
    } finally {
      setSalvandoAlimento(false);
    }
  };

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
      
      const kcalFormatado = metadados.faseCaloricas.toLowerCase().includes('kcal') 
        ? metadados.faseCaloricas 
        : `${metadados.faseCaloricas} kcal`;
      conteudoPrescricao += `Prescrição Dietética: ${kcalFormatado}\n\n`;
      conteudoPrescricao += `${'='.repeat(60)}\n\n`;

      blocos.forEach((bloco) => {
        if (bloco.tipo === 'condutas' && bloco.conteudoTexto?.trim()) {
          conteudoPrescricao += `CONDUTAS / ORIENTAÇÕES GERAIS\n`;
          conteudoPrescricao += `${bloco.conteudoTexto.trim()}\n\n`;
          conteudoPrescricao += `${'='.repeat(60)}\n\n`;
        } else if (bloco.tipo === 'texto_livre' && bloco.conteudoTexto?.trim()) {
          if (bloco.titulo) conteudoPrescricao += `${bloco.titulo.toUpperCase()}\n`;
          conteudoPrescricao += `${bloco.conteudoTexto.trim()}\n\n`;
          conteudoPrescricao += `${'='.repeat(60)}\n\n`;
        } else if (bloco.tipo === 'refeicao' && bloco.nome) {
          conteudoPrescricao += `${bloco.nome.toUpperCase()}\n`;

          if (bloco.metaCarboidratos || bloco.metaProteinas) {
            conteudoPrescricao += `META INSULINA: `;
            if (bloco.metaCarboidratos)
              conteudoPrescricao += `até ${bloco.metaCarboidratos}g de Carboidratos`;
            if (bloco.metaCarboidratos && bloco.metaProteinas)
              conteudoPrescricao += ` | `;
            if (bloco.metaProteinas)
              conteudoPrescricao += `Proteína: ${bloco.metaProteinas}g`;
            conteudoPrescricao += `\n`;
          }

          (bloco.opcoes || []).forEach((opcao, idx) => {
            const temItensPreenchidos = opcao.itens.some((i) => i.nome.trim() || i.quantidade.trim());
            if (temItensPreenchidos) {
              if (bloco.opcoes!.length > 1) {
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

          if (bloco.observacoes?.trim()) {
            conteudoPrescricao += `\nObs: ${bloco.observacoes}\n\n`;
          } else {
            conteudoPrescricao += `\n\n`;
          }
        }
      });

      if (tabelasSelecionadas.proteinas && alvosTabelas.proteinas) {
        conteudoPrescricao += `${'='.repeat(60)}\nTABELA 1: PROTEÍNAS ANIMAIS (Alvo: ${alvosTabelas.proteinas}g PTN)\n${'='.repeat(60)}\n`;
        tabelaProteinas.forEach(item => {
          if (item.nome) conteudoPrescricao += `• ${item.nome} - ${calcularPesoEquivalente(alvosTabelas.proteinas, item.baseMacro)}\n`;
        });
        conteudoPrescricao += `• Ovos - Ajustar (1 ovo = ~6g ptn)\n\n`;
      }
      
      if (tabelasSelecionadas.substitutosArroz && alvosTabelas.substitutosArroz) {
        conteudoPrescricao += `${'='.repeat(60)}\nTABELA 2: SUBSTITUTOS DE ARROZ (Alvo: ${alvosTabelas.substitutosArroz}g CHO)\n${'='.repeat(60)}\n`;
        tabelaArroz.forEach(item => {
          if (item.nome) conteudoPrescricao += `• ${item.nome} - ${calcularPesoEquivalente(alvosTabelas.substitutosArroz, item.baseMacro)}\n`;
        });
        conteudoPrescricao += `• Feijão: as mesmas quantidades para ervilha, lentilha ou grão-de-bico (60g)\n\n`;
      }

      if (tabelasSelecionadas.frutas && alvosTabelas.frutas) {
        conteudoPrescricao += `${'='.repeat(60)}\nTABELA 3: FRUTAS (Alvo: ${alvosTabelas.frutas}g CHO)\n${'='.repeat(60)}\n`;
        tabelaFrutas.forEach(item => {
          if (item.nome) conteudoPrescricao += `• ${item.nome} - ${calcularPesoEquivalente(alvosTabelas.frutas, item.baseMacro)}\n`;
        });
        conteudoPrescricao += `\n`;
      }

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
      setMetadados({ pacienteId: '', pacienteNome: '', faseCaloricas: '', dataPrescricao: new Date().toISOString().split('T')[0] });
      setBlocos([
        { id: `cond-${Date.now()}`, tipo: 'condutas', conteudoTexto: '', expandido: false, colapsado: false },
        { id: `ref-${Date.now()}`, tipo: 'refeicao', nome: 'Café da Manhã', metaCarboidratos: '', metaProteinas: '', opcoes: [{ id: `op-${Date.now()}`, itens: [{ id: `it-${Date.now()}`, quantidade: '', nome: '' }] }], observacoes: '', expandido: false, colapsado: false }
      ]);
      setTabelasSelecionadas({ proteinas: false, substitutosArroz: false, frutas: false });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar prescrição');
    } finally {
      setLoading(false);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); 
      };
      reader.onerror = error => reject(error);
    });
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const handleAssinar = async () => {
    if (!certFile || !certPassword) {
      setSignError('Por favor, selecione o certificado e digite a senha.');
      return;
    }
    setIsSigning(true);
    setSignError(null);

    try {
      const element = document.getElementById('print-area');
      if (!element) throw new Error("Área de impressão não encontrada");

      element.classList.remove('hidden', 'print:block');
      const canvas = await html2canvas(element, { scale: 1.5, useCORS: true });
      element.classList.add('hidden', 'print:block');

      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;
      let currentPage = 1;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        currentPage++;
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.setPage(currentPage);
      const baseY = pageHeight - 30;
      const nomeCompleto = 'Carolina de Souza Silva Macedo';

      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(16);
      pdf.text(nomeCompleto, 25, baseY);

      const tamanhoNome = pdf.getTextWidth(nomeCompleto);
      const inicioTextoDireita = 25 + tamanhoNome + 3;

      pdf.setFontSize(8); 
      pdf.text(`Assinado de forma digital por ${nomeCompleto}`, inicioTextoDireita, baseY - 2.5);
      
      const dataAtual = new Date();
      const ano = dataAtual.getFullYear();
      const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
      const dia = String(dataAtual.getDate()).padStart(2, '0');
      const hora = String(dataAtual.getHours()).padStart(2, '0');
      const min = String(dataAtual.getMinutes()).padStart(2, '0');
      const sec = String(dataAtual.getSeconds()).padStart(2, '0');
      const formatDataAdobe = `${ano}.${mes}.${dia} ${hora}:${min}:${sec} -03'00'`;
      
      pdf.text(`Dados: ${formatDataAdobe}`, inicioTextoDireita, baseY + 1.5);

      const pdfArrayBuffer = pdf.output('arraybuffer');
      const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);
      const certBase64 = await convertFileToBase64(certFile);

      const response = await fetch('/api/assinar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64, certBase64, password: certPassword })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao assinar documento.');
      }

      const data = await response.json();

      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${data.signedPdf}`;
      link.download = `Prescricao_${metadados.pacienteNome || 'Paciente'}_Assinada.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsSignModalOpen(false);
      setCertPassword('');
      setCertFile(null);
    } catch (err: any) {
      setSignError(err.message || 'Ocorreu um erro inesperado ao assinar.');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative pb-20">
      <div className="print:hidden">
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Construtor de Prescrição</h1>
              <p className="text-slate-600 text-sm mt-1">Adicione e reordene blocos como quiser</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition"
              >
                <Printer className="w-4 h-4" /> Imprimir 
              </button>
              
              <button
                type="button"
                onClick={() => setIsSignModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm"
              >
                <FileSignature className="w-4 h-4" /> Assinar PDF
              </button>

              <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium text-sm ml-2">
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

            {/* CABEÇALHO / METADADOS (Colapsável) */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div 
                className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setMetadadosColapsado(!metadadosColapsado)}
              >
                <h2 className="text-xl font-bold text-slate-900">Cabeçalho (Metadados)</h2>
                <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${metadadosColapsado ? 'rotate-180' : ''}`} />
              </div>
              
              {!metadadosColapsado && (
                <div className="p-8">
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
              )}
            </div>

            {/* RENDERIZAÇÃO DOS BLOCOS ADICIONÁVEIS */}
            {blocos.map((bloco, index) => (
              <div key={bloco.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden group">
                
                {/* Cabeçalho do Bloco */}
                <div 
                  className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => atualizarBloco(bloco.id, 'colapsado', !bloco.colapsado)}
                >
                  <div className="flex items-center gap-2 font-bold text-slate-700 uppercase text-xs tracking-wider">
                    {bloco.tipo === 'condutas' && <><ListChecks className="w-4 h-4 text-slate-500"/> Condutas Padrão</>}
                    {bloco.tipo === 'texto_livre' && <><Type className="w-4 h-4 text-slate-500"/> Texto Livre</>}
                    {bloco.tipo === 'refeicao' && <><Utensils className="w-4 h-4 text-slate-500"/> Refeição</>}
                    
                    {bloco.colapsado && (
                      <span className="ml-2 text-slate-400 normal-case font-medium truncate max-w-[200px] md:max-w-md">
                        {bloco.tipo === 'refeicao' ? `- ${bloco.nome || 'Sem horário'}` : ''}
                        {bloco.tipo === 'texto_livre' ? `- ${bloco.titulo || 'Sem título'}` : ''}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => moverBloco(index, 'cima')} disabled={index === 0} className="p-1.5 text-slate-400 hover:text-slate-800 disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
                      <button type="button" onClick={() => moverBloco(index, 'baixo')} disabled={index === blocos.length - 1} className="p-1.5 text-slate-400 hover:text-slate-800 disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
                      <div className="w-px h-4 bg-slate-300 mx-2"></div>
                      <button type="button" onClick={() => removerBloco(bloco.id)} className="p-1.5 text-red-400 hover:text-red-700"><Trash2 className="w-4 h-4"/></button>
                    </div>
                    <button type="button" onClick={() => atualizarBloco(bloco.id, 'colapsado', !bloco.colapsado)} className="p-1.5 text-slate-500 hover:text-slate-800 ml-1">
                      <ChevronDown className={`w-5 h-5 transition-transform ${bloco.colapsado ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Conteúdo do Bloco */}
                {!bloco.colapsado && (
                  <div className="p-6">
                    {bloco.tipo === 'condutas' && (
                      <div>
                        <textarea
                          value={bloco.conteudoTexto}
                          onChange={(e) => atualizarBloco(bloco.id, 'conteudoTexto', e.target.value)}
                          placeholder="Digite aqui orientações para a prescrição inteira ou selecione nas Condutas Padrão abaixo..."
                          rows={4}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none mb-4"
                        />
                        <button
                          type="button"
                          onClick={() => atualizarBloco(bloco.id, 'expandido', !bloco.expandido)}
                          className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg"
                        >
                          <span className="font-medium text-slate-900">Condutas Padrão (Salvas no Banco)</span>
                          <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform ${bloco.expandido ? 'rotate-180' : ''}`} />
                        </button>
                        {bloco.expandido && (
                          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="space-y-4">
                              {Object.entries(configsPorCategoria).map(([categoria, configs]) => (
                                <div key={categoria}>
                                  <h4 className="font-semibold text-slate-800 mb-2 text-sm">{categoria}</h4>
                                  <div className="space-y-2 pl-2">
                                    {configs.map((config) => (
                                      <label key={config.id} className="flex items-start gap-3 cursor-pointer hover:bg-white p-2 rounded transition">
                                        <input
                                          type="checkbox"
                                          checked={bloco.conteudoTexto?.includes(config.conteudo)}
                                          onChange={(e) => toggleCondutaBloco(bloco.id, config.conteudo, e.target.checked)}
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
                    )}

                    {bloco.tipo === 'texto_livre' && (
                      <div className="space-y-4">
                        <input 
                          type="text" 
                          value={bloco.titulo} 
                          onChange={(e) => atualizarBloco(bloco.id, 'titulo', e.target.value)} 
                          placeholder="Título da Sessão (Ex: Suplementação)" 
                          className="w-full px-4 py-2 font-bold text-lg border-b-2 border-slate-200 focus:border-emerald-500 focus:outline-none placeholder-slate-300"
                        />
                        <textarea
                          value={bloco.conteudoTexto}
                          onChange={(e) => atualizarBloco(bloco.id, 'conteudoTexto', e.target.value)}
                          placeholder="Digite o texto livre aqui..."
                          rows={5}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                        />
                      </div>
                    )}

                    {bloco.tipo === 'refeicao' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                          <div className="flex-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Horário / Refeição</label>
                            <input
                              type="text"
                              value={bloco.nome}
                              onChange={(e) => atualizarBloco(bloco.id, 'nome', e.target.value)}
                              placeholder="Ex: Café da Manhã e Lanche da Tarde"
                              className="px-4 py-2 border border-slate-300 rounded-lg w-full focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Meta Carboidratos (g)</label>
                            <input
                              type="number"
                              value={bloco.metaCarboidratos}
                              onChange={(e) => atualizarBloco(bloco.id, 'metaCarboidratos', e.target.value)}
                              placeholder="Ex: 30"
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Meta Proteínas (g)</label>
                            <input
                              type="number"
                              value={bloco.metaProteinas}
                              onChange={(e) => atualizarBloco(bloco.id, 'metaProteinas', e.target.value)}
                              placeholder="Ex: 18"
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-8">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Totais Calculados por Opção</h4>
                          <div className="space-y-2">
                            {(bloco.opcoes || []).map((opcao, idx) => {
                              let tCho = 0, tPtn = 0, tLip = 0;
                              opcao.itens.forEach((it) => {
                                const qtdNum = parseQtd(it.quantidade);
                                if (it.baseMacros) {
                                  tCho += (it.baseMacros.cho * qtdNum) / 100;
                                  tPtn += (it.baseMacros.ptn * qtdNum) / 100;
                                  tLip += (it.baseMacros.lip * qtdNum) / 100;
                                }
                              });

                              const estourouCho = bloco.metaCarboidratos && tCho > Number(bloco.metaCarboidratos);
                              const estourouPtn = bloco.metaProteinas && tPtn > Number(bloco.metaProteinas);

                              return (
                                <div key={opcao.id} className="flex gap-4 text-sm bg-white p-2 border border-slate-100 rounded">
                                  <span className="font-semibold text-slate-700 w-20">Opção {idx + 1}:</span>
                                  <span className={`font-mono ${estourouCho ? 'text-red-600 font-bold' : 'text-slate-600'}`}>C: {tCho.toFixed(1)}g</span>
                                  <span className={`font-mono ${estourouPtn ? 'text-red-600 font-bold' : 'text-slate-600'}`}>P: {tPtn.toFixed(1)}g</span>
                                  <span className="font-mono text-slate-600">L: {tLip.toFixed(1)}g</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-6 mb-8">
                          {(bloco.opcoes || []).map((opcao, idx) => (
                            <div key={opcao.id}>
                              {(bloco.opcoes || []).length > 1 && (
                                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                  <span className="text-sm font-bold text-slate-700 uppercase">Opção {idx + 1}</span>
                                  <button type="button" onClick={() => removerOpcao(bloco.id, opcao.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              )}

                              {opcao.itens.map((item) => {
                                const qtdNum = parseQtd(item.quantidade);
                                const calcM = (base?: number) => base ? ((base * qtdNum) / 100).toFixed(1) : '--';

                                return (
                                  <div key={item.id} className="flex flex-col gap-2 mb-4 bg-white border border-slate-100 p-2 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-2">
                                      <div className="text-slate-300 cursor-move"><GripVertical className="w-5 h-5" /></div>
                                      <BuscaAlimento 
                                        valorInicial={item.nome}
                                        onSelect={(nome, macros, dbId) => {
                                          setBlocos(prev => prev.map(b => b.id === bloco.id && b.tipo === 'refeicao' ? {
                                            ...b,
                                            opcoes: b.opcoes!.map(o => o.id === opcao.id ? {
                                              ...o,
                                              itens: o.itens.map(i => i.id === item.id ? { ...i, nome: nome, baseMacros: macros, dbId: dbId } : i)
                                            } : o)
                                          } : b));
                                        }}
                                      />
                                      <input
                                        type="text"
                                        value={item.quantidade}
                                        onChange={(e) => atualizarItem(bloco.id, opcao.id, item.id, 'quantidade', e.target.value)}
                                        placeholder="Qtd (Ex: 100g)"
                                        className="w-28 px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 text-sm"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setModalEdicao({
                                          isOpen: true,
                                          id: item.dbId || '',
                                          nome: item.nome,
                                          cho: String(item.baseMacros?.cho || 0),
                                          ptn: String(item.baseMacros?.ptn || 0),
                                          lip: String(item.baseMacros?.lip || 0),
                                        })}
                                        className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                                        title="Refinar este alimento no banco de dados"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button type="button" onClick={() => removerItem(bloco.id, opcao.id, item.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                    </div>

                                    <div className="flex items-center pl-8 gap-2">
                                      <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => toggleMacroAtivo(bloco.id, opcao.id, item.id, item.macroAtivo === 'cho' ? null : 'cho')} className={`px-2 py-1 text-[11px] font-mono border rounded transition-colors ${item.macroAtivo === 'cho' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>C: {calcM(item.baseMacros?.cho)}</button>
                                        <button type="button" onClick={() => toggleMacroAtivo(bloco.id, opcao.id, item.id, item.macroAtivo === 'ptn' ? null : 'ptn')} className={`px-2 py-1 text-[11px] font-mono border rounded transition-colors ${item.macroAtivo === 'ptn' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>P: {calcM(item.baseMacros?.ptn)}</button>
                                        <button type="button" onClick={() => toggleMacroAtivo(bloco.id, opcao.id, item.id, item.macroAtivo === 'lip' ? null : 'lip')} className={`px-2 py-1 text-[11px] font-mono border rounded transition-colors ${item.macroAtivo === 'lip' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>L: {calcM(item.baseMacros?.lip)}</button>
                                      </div>
                                      {item.macroAtivo && (
                                        <div className="flex items-center gap-2 ml-2 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
                                          <Target className="w-3 h-3 text-emerald-600" />
                                          <span className="text-[11px] font-semibold text-emerald-800">Alvo {item.macroAtivo.toUpperCase()} (g):</span>
                                          <input type="number" value={item.macroAlvo || ''} onChange={(e) => atualizarAlvoMacro(bloco.id, opcao.id, item.id, e.target.value)} placeholder="Ex: 15" className="w-16 px-2 py-0.5 text-[11px] font-mono border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="mt-2">
                                <button type="button" onClick={() => adicionarItem(bloco.id, opcao.id)} className="text-emerald-600 font-medium text-sm flex items-center gap-1 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md transition"><Plus className="w-4 h-4" /> Adicionar Alimento</button>
                              </div>
                            </div>
                          ))}
                          <button type="button" onClick={() => adicionarOpcao(bloco.id)} className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-emerald-500 hover:text-emerald-600 font-medium transition flex items-center justify-center gap-2 mt-4"><Plus className="w-4 h-4" /> Adicionar Nova Opção</button>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Observações</label>
                          <textarea value={bloco.observacoes} onChange={(e) => atualizarBloco(bloco.id, 'observacoes', e.target.value)} placeholder="Orientações específicas ou opcionais apenas para esta refeição..." rows={2} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* BOTÕES PARA ADICIONAR BLOCOS NO MEIO DA PRESCRIÇÃO */}
            <div className="flex flex-wrap items-center justify-center gap-4 py-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
              <span className="text-sm font-semibold text-slate-500 w-full text-center">Adicionar novo bloco à prescrição:</span>
              <button type="button" onClick={() => adicionarBloco('condutas')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:border-emerald-500 hover:text-emerald-600 font-medium shadow-sm transition"><ListChecks className="w-4 h-4"/> Condutas Padrão</button>
              <button type="button" onClick={() => adicionarBloco('texto_livre')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:border-emerald-500 hover:text-emerald-600 font-medium shadow-sm transition"><Type className="w-4 h-4"/> Texto Livre</button>
              <button type="button" onClick={() => adicionarBloco('refeicao')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:border-emerald-500 hover:text-emerald-600 font-medium shadow-sm transition"><Utensils className="w-4 h-4"/> Refeição</button>
            </div>

            {/* TABELAS FIXAS NO RODAPÉ (Colapsável e Dinâmicas) */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div 
                className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setTabelasColapsadas(!tabelasColapsadas)}
              >
                <h2 className="text-xl font-bold text-slate-900">Tabelas de Equivalentes (Cálculo Automático)</h2>
                <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${tabelasColapsadas ? 'rotate-180' : ''}`} />
              </div>

              {!tabelasColapsadas && (
                <div className="p-8 space-y-4">
                  
                  {/* Tabela 1: Proteínas */}
                  <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                    <div className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input type="checkbox" checked={tabelasSelecionadas.proteinas} onChange={() => toggleTabela('proteinas')} className="w-5 h-5 text-emerald-600 rounded" />
                        <span className="font-medium text-slate-900">Tabela 1: Proteínas Animais</span>
                      </label>
                      {tabelasSelecionadas.proteinas && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-amber-700">Alvo PTN (g):</span>
                          <input type="number" value={alvosTabelas.proteinas} onChange={(e) => setAlvosTabelas({ ...alvosTabelas, proteinas: e.target.value })} placeholder="Ex: 20" className="w-24 px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500" />
                        </div>
                      )}
                    </div>
                    {tabelasSelecionadas.proteinas && (
                      <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                        {tabelaProteinas.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                            <BuscaAlimento 
                              valorInicial={item.nome} 
                              onSelect={(nome, macros, dbId) => atualizarItemTabela('proteinas', item.id, nome, macros, dbId)} 
                            />
                            <div className="w-24 text-xs font-bold text-slate-600 bg-white border border-slate-200 py-2 text-center rounded">
                              {calcularPesoEquivalente(alvosTabelas.proteinas, item.baseMacro)}
                            </div>
                            <button
                              type="button"
                              onClick={() => setModalEdicao({ isOpen: true, id: item.dbId || '', nome: item.nome, cho: String(item.macrosReal?.cho || 0), ptn: String(item.macrosReal?.ptn || 0), lip: String(item.macrosReal?.lip || 0) })}
                              className="p-2 text-slate-400 hover:text-emerald-600"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => removerItemTabela('proteinas', item.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => adicionarItemTabela('proteinas')} className="text-emerald-600 text-sm font-medium flex items-center gap-1 mt-2 hover:bg-emerald-50 px-3 py-2 rounded-md"><Plus className="w-4 h-4"/> Adicionar Alimento na Tabela</button>
                      </div>
                    )}
                  </div>

                  {/* Tabela 2: Substitutos de Arroz */}
                  <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                    <div className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input type="checkbox" checked={tabelasSelecionadas.substitutosArroz} onChange={() => toggleTabela('substitutosArroz')} className="w-5 h-5 text-emerald-600 rounded" />
                        <span className="font-medium text-slate-900">Tabela 2: Substitutos de Arroz</span>
                      </label>
                      {tabelasSelecionadas.substitutosArroz && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-blue-700">Alvo CHO (g):</span>
                          <input type="number" value={alvosTabelas.substitutosArroz} onChange={(e) => setAlvosTabelas({ ...alvosTabelas, substitutosArroz: e.target.value })} placeholder="Ex: 30" className="w-24 px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500" />
                        </div>
                      )}
                    </div>
                    {tabelasSelecionadas.substitutosArroz && (
                      <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                        {tabelaArroz.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                            <BuscaAlimento 
                              valorInicial={item.nome} 
                              onSelect={(nome, macros, dbId) => atualizarItemTabela('arroz', item.id, nome, macros, dbId)} 
                            />
                            <div className="w-24 text-xs font-bold text-slate-600 bg-white border border-slate-200 py-2 text-center rounded">
                              {calcularPesoEquivalente(alvosTabelas.substitutosArroz, item.baseMacro)}
                            </div>
                            <button
                              type="button"
                              onClick={() => setModalEdicao({ isOpen: true, id: item.dbId || '', nome: item.nome, cho: String(item.macrosReal?.cho || 0), ptn: String(item.macrosReal?.ptn || 0), lip: String(item.macrosReal?.lip || 0) })}
                              className="p-2 text-slate-400 hover:text-emerald-600"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => removerItemTabela('arroz', item.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => adicionarItemTabela('arroz')} className="text-emerald-600 text-sm font-medium flex items-center gap-1 mt-2 hover:bg-emerald-50 px-3 py-2 rounded-md"><Plus className="w-4 h-4"/> Adicionar Alimento na Tabela</button>
                      </div>
                    )}
                  </div>

                  {/* Tabela 3: Frutas */}
                  <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                    <div className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input type="checkbox" checked={tabelasSelecionadas.frutas} onChange={() => toggleTabela('frutas')} className="w-5 h-5 text-emerald-600 rounded" />
                        <span className="font-medium text-slate-900">Tabela 3: Frutas</span>
                      </label>
                      {tabelasSelecionadas.frutas && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-blue-700">Alvo CHO (g):</span>
                          <input type="number" value={alvosTabelas.frutas} onChange={(e) => setAlvosTabelas({ ...alvosTabelas, frutas: e.target.value })} placeholder="Ex: 15" className="w-24 px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500" />
                        </div>
                      )}
                    </div>
                    {tabelasSelecionadas.frutas && (
                      <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                        {tabelaFrutas.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                            <BuscaAlimento 
                              valorInicial={item.nome} 
                              onSelect={(nome, macros, dbId) => atualizarItemTabela('frutas', item.id, nome, macros, dbId)} 
                            />
                            <div className="w-24 text-xs font-bold text-slate-600 bg-white border border-slate-200 py-2 text-center rounded">
                              {calcularPesoEquivalente(alvosTabelas.frutas, item.baseMacro)}
                            </div>
                            <button
                              type="button"
                              onClick={() => setModalEdicao({ isOpen: true, id: item.dbId || '', nome: item.nome, cho: String(item.macrosReal?.cho || 0), ptn: String(item.macrosReal?.ptn || 0), lip: String(item.macrosReal?.lip || 0) })}
                              className="p-2 text-slate-400 hover:text-emerald-600"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => removerItemTabela('frutas', item.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => adicionarItemTabela('frutas')} className="text-emerald-600 text-sm font-medium flex items-center gap-1 mt-2 hover:bg-emerald-50 px-3 py-2 rounded-md"><Plus className="w-4 h-4"/> Adicionar Alimento na Tabela</button>
                      </div>
                    )}
                  </div>

                </div>
              )}
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

      <div id="print-area" className="hidden print:block bg-white text-black font-serif max-w-[210mm] mx-auto p-12 text-[11pt]">

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

        <div className="text-right text-[9pt] text-[#1e3a8a] flex flex-col items-end mb-8 font-sans leading-snug">
          <p className="text-black font-bold mb-1">Data: {metadados.dataPrescricao}</p>
          <p className="font-bold">Nutricionista: Carolina Macedo CRN 29096</p>
          <p className="underline text-blue-700">carolinamacedo.nutri@gmail.com</p>
          <p className="underline text-blue-700">www.carolinaminhanutri.com</p>
          <p className="font-bold">(19) 98314-1909</p>
        </div>

        <p className="text-justify mb-10 leading-relaxed font-sans">
          <span className="font-bold text-[#1e3a8a]">Prescrição Dietética:</span>{' '}
          {(() => {
            const valor = metadados.faseCaloricas || '';
            if (!valor) return null;
            const jaTemKcal = valor.toLowerCase().includes('kcal');
            return jaTemKcal ? valor : `${valor} kcal`;
          })()}
        </p>

        {/* IMPRESSÃO DINÂMICA DOS BLOCOS */}
        <div className="space-y-10 font-sans">
          {blocos.map((bloco) => {
            if (bloco.tipo === 'condutas' && bloco.conteudoTexto?.trim()) {
              return (
                <div key={bloco.id} className="mb-10 font-sans break-inside-avoid">
                  <h3 className="text-[14pt] font-bold text-[#1e3a8a] mb-2">Orientações Gerais</h3>
                  <p className="whitespace-pre-line text-[11pt] text-gray-800 leading-relaxed text-justify">
                    {bloco.conteudoTexto}
                  </p>
                </div>
              );
            }

            if (bloco.tipo === 'texto_livre' && bloco.conteudoTexto?.trim()) {
              return (
                <div key={bloco.id} className="mb-10 font-sans break-inside-avoid">
                  {bloco.titulo && <h3 className="text-[14pt] font-bold text-[#1e3a8a] mb-2">{bloco.titulo}</h3>}
                  <p className="whitespace-pre-line text-[11pt] text-gray-800 leading-relaxed text-justify">
                    {bloco.conteudoTexto}
                  </p>
                </div>
              );
            }

            if (bloco.tipo === 'refeicao') {
              const temConteudo = (bloco.opcoes || []).some((op) =>
                op.itens.some((it) => it.nome || it.quantidade)
              );
              if (!temConteudo) return null;

              return (
                <div key={bloco.id} className="break-inside-avoid">
                  <div className="mb-4">
                    <h3 className="text-[14pt] font-bold text-[#1e3a8a] mb-1">{bloco.nome}</h3>
                    {(bloco.metaCarboidratos || bloco.metaProteinas) && (
                      <p className="text-xs font-bold uppercase tracking-wide">
                        <span className="text-[#1e3a8a]">META INSULINA: </span>
                        {bloco.metaCarboidratos && (
                          <span className="text-[#1e3a8a]">
                            até {bloco.metaCarboidratos}g de Carboidratos{' '}
                          </span>
                        )}
                        {bloco.metaCarboidratos && bloco.metaProteinas && (
                          <span className="text-black mx-1">|</span>
                        )}
                        {bloco.metaProteinas && (
                          <span className="text-[#b45309]">Proteína: {bloco.metaProteinas}g</span>
                        )}
                      </p>
                    )}
                  </div>

                  {(bloco.opcoes || []).map((opcao, idx) => {
                    const temItemPreenchido = opcao.itens.some((i) => i.nome || i.quantidade);
                    if (!temItemPreenchido) return null;

                    return (
                      <div key={opcao.id} className="mb-6 pl-2">
                        {bloco.opcoes!.length > 1 && (
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

                  {bloco.observacoes && (
                    <p className="italic text-[10pt] mt-3 whitespace-pre-line pl-6 text-gray-800">
                      Obs: {bloco.observacoes}
                    </p>
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>

        {(tabelasSelecionadas.proteinas || tabelasSelecionadas.substitutosArroz || tabelasSelecionadas.frutas) && (
          <div className="mt-14 break-before-auto font-sans">

            {tabelasSelecionadas.proteinas && alvosTabelas.proteinas && (
              <div className="mb-10 break-inside-avoid">
                <h3 className="font-bold text-[#1e3a8a] text-[12pt] mb-2">
                  Tabela 1: aprox. {alvosTabelas.proteinas}g de Proteína Animal (Peso Pronto)
                </h3>
                <table className="w-full border-collapse border border-black text-[10.5pt]">
                  <thead>
                    <tr>
                      <th className="border border-black text-left px-3 py-1.5 font-bold">Opção de Proteína</th>
                      <th className="border border-black text-left px-3 py-1.5 font-bold w-1/3">Quantidade / Peso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabelaProteinas.map((item, idx) => {
                      if (!item.nome) return null;
                      return (
                        <tr key={idx}>
                          <td className="border border-black px-3 py-1.5">{item.nome}</td>
                          <td className="border border-black px-3 py-1.5">{calcularPesoEquivalente(alvosTabelas.proteinas, item.baseMacro)}</td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td className="border border-black px-3 py-1.5">Ovos</td>
                      <td className="border border-black px-3 py-1.5 italic">Ajustar (1 ovo = ~6g ptn)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {tabelasSelecionadas.substitutosArroz && alvosTabelas.substitutosArroz && (
              <div className="mb-10 break-inside-avoid">
                <h3 className="font-bold text-[#1e3a8a] text-[12pt] mb-2">
                  Tabela 2: Substitutos de Arroz (porção do almoço aprox. {alvosTabelas.substitutosArroz}g Carboidratos)
                </h3>
                <table className="w-full border-collapse border border-black text-[10.5pt]">
                  <thead>
                    <tr>
                      <th className="border border-black text-left px-3 py-1.5 font-bold">Alimento</th>
                      <th className="border border-black text-left px-3 py-1.5 font-bold w-1/3">Quantidade Equivalente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabelaArroz.map((item, idx) => {
                      if (!item.nome) return null;
                      return (
                        <tr key={idx}>
                          <td className="border border-black px-3 py-1.5">{item.nome}</td>
                          <td className="border border-black px-3 py-1.5">{calcularPesoEquivalente(alvosTabelas.substitutosArroz, item.baseMacro)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <p className="text-[10pt] mt-2 font-bold text-gray-800">
                  Feijão: as mesmas quantidades para ervilha, lentilha ou grão-de-bico (60g)
                </p>
              </div>
            )}

            {tabelasSelecionadas.frutas && alvosTabelas.frutas && (
              <div className="mb-10 break-inside-avoid">
                <h3 className="font-bold text-[#1e3a8a] text-[12pt] mb-2">
                  Tabela 3: Frutas (1 porção ≈ {alvosTabelas.frutas}g Carboidratos)
                </h3>
                <table className="w-full border-collapse border border-black text-[10.5pt]">
                  <thead>
                    <tr>
                      <th className="border border-black text-left px-3 py-1.5 font-bold">Fruta</th>
                      <th className="border border-black text-left px-3 py-1.5 font-bold w-1/3">Peso / Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabelaFrutas.map((item, idx) => {
                      if (!item.nome) return null;
                      return (
                        <tr key={idx}>
                          <td className="border border-black px-3 py-1.5">{item.nome}</td>
                          <td className="border border-black px-3 py-1.5">{calcularPesoEquivalente(alvosTabelas.frutas, item.baseMacro)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {isSignModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-blue-600" /> Assinatura Digital
              </h3>
              <button onClick={() => !isSigning && setIsSignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {signError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                  {signError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">1. Certificado A1 (.pfx)</label>
                <input 
                  type="file" 
                  accept=".pfx,.p12"
                  onChange={(e) => setCertFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={isSigning}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">2. Senha do Certificado</label>
                <input 
                  type="password"
                  value={certPassword}
                  onChange={(e) => setCertPassword(e.target.value)}
                  placeholder="Digite a senha..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSigning}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsSignModalOpen(false)}
                disabled={isSigning}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAssinar}
                disabled={isSigning}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:bg-blue-400"
              >
                {isSigning ? <><Loader2 className="w-4 h-4 animate-spin" /> Assinando...</> : 'Assinar Documento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          NOVO MODAL: EDIÇÃO DE ALIMENTO NO BANCO
          ======================================================== */}
      {modalEdicao.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Refinar Alimento</h3>
              <button onClick={() => setModalEdicao({ ...modalEdicao, isOpen: false })} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome de Exibição</label>
                <input 
                  type="text" 
                  value={modalEdicao.nome}
                  onChange={(e) => setModalEdicao({...modalEdicao, nome: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CHO (g)</label>
                  <input 
                    type="number" 
                    value={modalEdicao.cho}
                    onChange={(e) => setModalEdicao({...modalEdicao, cho: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PTN (g)</label>
                  <input 
                    type="number" 
                    value={modalEdicao.ptn}
                    onChange={(e) => setModalEdicao({...modalEdicao, ptn: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">LIP (g)</label>
                  <input 
                    type="number" 
                    value={modalEdicao.lip}
                    onChange={(e) => setModalEdicao({...modalEdicao, lip: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center mt-2">
                <span className="text-sm font-medium text-slate-600">Calorias (Automático)</span>
                <span className="font-bold text-emerald-600">{caloriasCalculadas.toFixed(1)} kcal</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setModalEdicao({ ...modalEdicao, isOpen: false })}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAtualizarAlimento}
                disabled={salvandoAlimento || !modalEdicao.nome.trim()}
                className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition disabled:bg-slate-400"
              >
                {salvandoAlimento ? 'Salvando...' : 'Salvar Alteração'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}