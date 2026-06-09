'use client';

import { useState, useCallback } from 'react';
import { PageHeader, Alert } from '@/components';

// ─── Types ────────────────────────────────────────────────────────────────────

type Sexo = 'masculino' | 'feminino' | 'criança';
type NivelAtividade = 'sedentario' | 'leve' | 'moderado' | 'ativo' | 'extremo';
type Objetivo = 'perder' | 'manter' | 'ganhar';

interface ResultadoCalorias {
  tmb: number;
  fatorAtividade: number;
  caloriasManutencao: number;
  caloriasObjetivo: number;
}

interface MacrosTotais {
  carboidrato: number;
  proteina: number;
  gordura: number;
}

interface RefeicaoMacros {
  carb: number;
  prot: number;
  gord: number;
}

// ─── Engine de cálculo (port de calculadoras.py) ──────────────────────────────

function calcularTMB(peso: number, altura: number, idade: number, sexo: Sexo): number | null {
  if (peso <= 0 || altura <= 0 || idade <= 0) return null;
  if (sexo === 'criança') {
    if (idade >= 18) return null;
    if (idade <= 3) return Math.round(59.512 * peso - 30.4);
    if (idade <= 10) return Math.round(22.706 * peso + 504.3);
    return Math.round(17.686 * peso + 658.2);
  }
  if (sexo === 'masculino') return Math.round(10 * peso + 6.25 * altura - 5 * idade + 5);
  if (sexo === 'feminino') return Math.round(10 * peso + 6.25 * altura - 5 * idade - 161);
  return null;
}

const FATORES_NAF: Record<NivelAtividade, number> = {
  sedentario: 1.2, leve: 1.375, moderado: 1.55, ativo: 1.725, extremo: 1.9,
};

function calcularNecessidadeCalorica(
  peso: number, altura: number, idade: number,
  sexo: Sexo, nivelAtividade: NivelAtividade, objetivo: Objetivo
): ResultadoCalorias | null {
  const tmb = calcularTMB(peso, altura, idade, sexo);
  if (tmb === null) return null;
  const fator = FATORES_NAF[nivelAtividade];
  const manutencao = Math.round(tmb * fator);
  let meta = manutencao;
  if (objetivo === 'perder') meta -= 500;
  if (objetivo === 'ganhar') meta += 500;
  return { tmb, fatorAtividade: fator, caloriasManutencao: manutencao, caloriasObjetivo: meta };
}

function calcularMacrosPorPorcentagem(
  totalKcal: number, percCarb: number, percProt: number, percGord: number
): MacrosTotais | null {
  if (Math.round(percCarb + percProt + percGord) !== 100) return null;
  return {
    carboidrato: Math.round((totalKcal * (percCarb / 100)) / 4),
    proteina: Math.round((totalKcal * (percProt / 100)) / 4),
    gordura: Math.round((totalKcal * (percGord / 100)) / 9),
  };
}

function distribuirMacros(
  macros: MacrosTotais, numGrandes: number, numPequenas: number, percGrandes: number
): { grande: RefeicaoMacros; pequena: RefeicaoMacros } | null {
  if (numGrandes + numPequenas === 0) return null;
  const percP = 100 - percGrandes;
  const g = (v: number, n: number) => n > 0 ? Math.round((v * percGrandes) / 100 / n) : 0;
  const p = (v: number, n: number) => n > 0 ? Math.round((v * percP) / 100 / n) : 0;
  return {
    grande: { carb: g(macros.carboidrato, numGrandes), prot: g(macros.proteina, numGrandes), gord: g(macros.gordura, numGrandes) },
    pequena: { carb: p(macros.carboidrato, numPequenas), prot: p(macros.proteina, numPequenas), gord: p(macros.gordura, numPequenas) },
  };
}

// ─── UI helpers locais (sem depender dos componentes compartilhados para inputs) ─

function SectionCard({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function HelperText({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-500 mt-1">{children}</p>;
}

function StyledInput({
  name, value, onChange, placeholder, type = 'number', step, min, max, disabled,
}: {
  name?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; step?: string; min?: string; max?: string; disabled?: boolean;
}) {
  return (
    <input
      name={name}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      step={step}
      min={min}
      max={max}
      disabled={disabled}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900
        placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
        disabled:bg-slate-50 disabled:text-slate-400"
    />
  );
}

function StyledSelect({
  value, onChange, options, disabled,
}: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900
        focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
        disabled:bg-slate-50 disabled:text-slate-400"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function ResultCard({ label, value, unit, highlight }: {
  label: string; value: string | number; unit?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-4 border ${highlight
      ? 'bg-emerald-50 border-emerald-200'
      : 'bg-slate-50 border-slate-200'
    }`}>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>
        {value}
        {unit && <span className="text-sm font-normal text-slate-500 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

// ─── Tab: Necessidade Calórica ─────────────────────────────────────────────────

function TabCalorias({ onAvancar }: { onAvancar: (r: ResultadoCalorias, peso: number) => void }) {
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [idade, setIdade] = useState('');
  const [sexo, setSexo] = useState<Sexo>('feminino');
  const [nivelAtividade, setNivelAtividade] = useState<NivelAtividade>('leve');
  const [objetivo, setObjetivo] = useState<Objetivo>('manter');
  const [resultado, setResultado] = useState<ResultadoCalorias | null>(null);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  const calcular = () => {
    setErro('');
    const p = parseFloat(peso), a = parseFloat(altura), i = parseInt(idade);
    if (isNaN(p) || isNaN(a) || isNaN(i) || p <= 0 || a <= 0 || i <= 0) {
      setErro('Preencha peso, altura e idade com valores válidos.');
      return;
    }
    const res = calcularNecessidadeCalorica(p, a, i, sexo, nivelAtividade, objetivo);
    if (!res) { setErro('Não foi possível calcular. Verifique os dados.'); return; }
    setResultado(res);
  };

  const copiar = () => {
    if (!resultado) return;
    navigator.clipboard.writeText(
      `TMB: ${resultado.tmb} kcal/dia\nFator NAF: x${resultado.fatorAtividade}\nManutenção: ${resultado.caloriasManutencao} kcal/dia\nMeta: ${resultado.caloriasObjetivo} kcal/dia`
    );
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="space-y-6">
      <SectionCard emoji="📋" title="Dados do Paciente">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <FieldLabel>Peso (kg)</FieldLabel>
            <StyledInput value={peso} onChange={setPeso} placeholder="Ex: 70.5" step="0.1" min="20" max="300" />
            <HelperText>Peso atual em quilogramas</HelperText>
          </div>
          <div>
            <FieldLabel>Altura (cm)</FieldLabel>
            <StyledInput value={altura} onChange={setAltura} placeholder="Ex: 170" step="1" min="100" max="250" />
            <HelperText>Altura em centímetros</HelperText>
          </div>
          <div>
            <FieldLabel>Idade (anos)</FieldLabel>
            <StyledInput value={idade} onChange={setIdade} placeholder="Ex: 30" step="1" min="1" max="120" />
          </div>
          <div>
            <FieldLabel>Sexo biológico</FieldLabel>
            <StyledSelect
              value={sexo}
              onChange={(v) => setSexo(v as Sexo)}
              options={[
                { value: 'feminino', label: 'Feminino' },
                { value: 'masculino', label: 'Masculino' },
                { value: 'criança', label: 'Criança (< 18 anos) — Schofield' },
              ]}
            />
            <HelperText>Adultos: Mifflin-St Jeor | Crianças: Schofield</HelperText>
          </div>
          <div>
            <FieldLabel>Nível de atividade</FieldLabel>
            <StyledSelect
              value={nivelAtividade}
              onChange={(v) => setNivelAtividade(v as NivelAtividade)}
              options={[
                { value: 'sedentario', label: 'Sedentário (pouco ou nenhum exercício)' },
                { value: 'leve', label: 'Levemente ativo (1–3 dias/semana)' },
                { value: 'moderado', label: 'Moderadamente ativo (3–5 dias/semana)' },
                { value: 'ativo', label: 'Muito ativo (6–7 dias/semana)' },
                { value: 'extremo', label: 'Extremamente ativo (exercício pesado/trabalho físico)' },
              ]}
            />
          </div>
          <div>
            <FieldLabel>Objetivo</FieldLabel>
            <StyledSelect
              value={objetivo}
              onChange={(v) => setObjetivo(v as Objetivo)}
              options={[
                { value: 'perder', label: 'Perder peso (déficit de 500 kcal)' },
                { value: 'manter', label: 'Manter peso' },
                { value: 'ganhar', label: 'Ganhar peso (superávit de 500 kcal)' },
              ]}
            />
          </div>
        </div>
      </SectionCard>

      {erro && <Alert type="error" title="Erro" message={erro} />}

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={calcular}
          className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          🔢 Calcular necessidade
        </button>
        {resultado && (
          <>
            <button
              onClick={copiar}
              className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              {copiado ? '✓ Copiado!' : '📋 Copiar resultados'}
            </button>
            <button
              onClick={() => onAvancar(resultado, parseFloat(peso))}
              className="px-6 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              Avançar para distribuição →
            </button>
          </>
        )}
      </div>

      {resultado && (
        <SectionCard emoji="📊" title="Resultados do Cálculo Calórico">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ResultCard label="TMB" value={resultado.tmb} unit="kcal/dia" />
            <ResultCard label="Fator de atividade (NAF)" value={`×${resultado.fatorAtividade}`} />
            <ResultCard label="Calorias para manutenção" value={resultado.caloriasManutencao} unit="kcal/dia" />
            <ResultCard label="Meta para objetivo" value={resultado.caloriasObjetivo} unit="kcal/dia" highlight />
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Tab: Distribuição de Macros ──────────────────────────────────────────────

function TabMacros({ caloriasIniciais, pesoInicial }: { caloriasIniciais?: number; pesoInicial?: number }) {
  const [totalKcal, setTotalKcal] = useState(caloriasIniciais ? String(caloriasIniciais) : '');
  const [pesoPaciente, setPesoPaciente] = useState(pesoInicial ? String(pesoInicial) : '');
  const [percProt, setPercProt] = useState('20');
  const [percCarb, setPercCarb] = useState('45');
  const [percGord, setPercGord] = useState('35');
  const [numGrandes, setNumGrandes] = useState('3');
  const [numPequenas, setNumPequenas] = useState('3');
  const [percDistGrandes, setPercDistGrandes] = useState('70');
  const [macrosTotais, setMacrosTotais] = useState<MacrosTotais | null>(null);
  const [refeicoes, setRefeicoes] = useState<{ grandes: RefeicaoMacros[]; pequenas: RefeicaoMacros[] } | null>(null);
  const [redistribuirAuto, setRedistribuirAuto] = useState(true);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  const somaPerc = (parseFloat(percProt) || 0) + (parseFloat(percCarb) || 0) + (parseFloat(percGord) || 0);

  const calcular = useCallback(() => {
    setErro('');
    const kcal = parseInt(totalKcal), peso = parseFloat(pesoPaciente);
    const pP = parseFloat(percProt), pC = parseFloat(percCarb), pG = parseFloat(percGord);
    const nG = parseInt(numGrandes), nP = parseInt(numPequenas), percG = parseInt(percDistGrandes);
    if (isNaN(kcal) || isNaN(peso) || isNaN(pP) || isNaN(pC) || isNaN(pG) || isNaN(nG) || isNaN(nP)) {
      setErro('Preencha todos os campos corretamente.'); return;
    }
    const macros = calcularMacrosPorPorcentagem(kcal, pC, pP, pG);
    if (!macros) { setErro('A soma das porcentagens deve ser exatamente 100%.'); return; }
    setMacrosTotais(macros);
    const dist = distribuirMacros(macros, nG, nP, percG);
    if (dist) {
      setRefeicoes({
        grandes: Array(nG).fill(null).map(() => ({ ...dist.grande })),
        pequenas: Array(nP).fill(null).map(() => ({ ...dist.pequena })),
      });
    }
  }, [totalKcal, pesoPaciente, percProt, percCarb, percGord, numGrandes, numPequenas, percDistGrandes]);

  const atualizarRefeicao = (tipo: 'grandes' | 'pequenas', idx: number, campo: keyof RefeicaoMacros, valor: string) => {
    if (!refeicoes) return;
    const novas = { grandes: [...refeicoes.grandes], pequenas: [...refeicoes.pequenas] };
    const lista = novas[tipo];
    const oldVal = lista[idx][campo];
    const newVal = parseInt(valor) || 0;
    const delta = oldVal - newVal;
    lista[idx] = { ...lista[idx], [campo]: newVal };

    if (redistribuirAuto && lista.length > 1 && delta !== 0) {
      const peers = lista.filter((_, i) => i !== idx);
      const base = Math.floor(delta / peers.length);
      const resto = Math.abs(delta % peers.length);
      let peerCount = 0;
      lista.forEach((_, i) => {
        if (i !== idx) {
          const extra = peerCount < resto ? (delta > 0 ? 1 : -1) : 0;
          lista[i] = { ...lista[i], [campo]: lista[i][campo] + base + extra };
          peerCount++;
        }
      });
    }

    novas[tipo] = lista;
    setRefeicoes(novas);

    const somar = (arr: RefeicaoMacros[]) => arr.reduce(
      (acc, r) => ({ carboidrato: acc.carboidrato + r.carb, proteina: acc.proteina + r.prot, gordura: acc.gordura + r.gord }),
      { carboidrato: 0, proteina: 0, gordura: 0 }
    );
    const g = somar(novas.grandes), p = somar(novas.pequenas);
    setMacrosTotais({ carboidrato: g.carboidrato + p.carboidrato, proteina: g.proteina + p.proteina, gordura: g.gordura + p.gordura });
  };

  const peso = parseFloat(pesoPaciente) || 1;
  const totalAjustado = macrosTotais
    ? macrosTotais.proteina * 4 + macrosTotais.carboidrato * 4 + macrosTotais.gordura * 9
    : 0;

  const gerarTexto = () => {
    if (!macrosTotais || !refeicoes) return '';
    return [
      '=== Distribuição de Macronutrientes ===',
      `Total Ajustado: ${totalAjustado} kcal`,
      `Proteína: ${macrosTotais.proteina}g (${(macrosTotais.proteina / peso).toFixed(2)} g/kg)`,
      `Carboidrato: ${macrosTotais.carboidrato}g (${(macrosTotais.carboidrato / peso).toFixed(2)} g/kg)`,
      `Gordura: ${macrosTotais.gordura}g (${(macrosTotais.gordura / peso).toFixed(2)} g/kg)`,
      '', '=== Refeições ===',
      ...refeicoes.grandes.map((r, i) => `Refeição Grande ${i + 1}: Carb ${r.carb}g | Prot ${r.prot}g | Gord ${r.gord}g`),
      ...refeicoes.pequenas.map((r, i) => `Refeição Pequena ${i + 1}: Carb ${r.carb}g | Prot ${r.prot}g | Gord ${r.gord}g`),
    ].join('\n');
  };

  const copiar = () => {
    navigator.clipboard.writeText(gerarTexto());
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="space-y-6">
      <SectionCard emoji="⚙️" title="1. Configuração">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <FieldLabel required>Meta calórica (kcal)</FieldLabel>
            <StyledInput value={totalKcal} onChange={setTotalKcal} placeholder="Ex: 2000" />
            <HelperText>Use o valor calculado na aba anterior ou insira manualmente</HelperText>
          </div>
          <div>
            <FieldLabel required>Peso do paciente (kg)</FieldLabel>
            <StyledInput value={pesoPaciente} onChange={setPesoPaciente} placeholder="Ex: 70.5" step="0.1" />
          </div>
          <div>
            <FieldLabel required>Proteínas (%)</FieldLabel>
            <StyledInput value={percProt} onChange={setPercProt} placeholder="20" step="0.1" />
          </div>
          <div>
            <FieldLabel required>Carboidratos (%)</FieldLabel>
            <StyledInput value={percCarb} onChange={setPercCarb} placeholder="45" step="0.1" />
          </div>
          <div>
            <FieldLabel required>Gorduras (%)</FieldLabel>
            <StyledInput value={percGord} onChange={setPercGord} placeholder="35" step="0.1" />
            <HelperText>
              Soma atual:{' '}
              <span className={somaPerc === 100 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                {somaPerc.toFixed(1)}%
              </span>
              {' '}(deve ser 100%)
            </HelperText>
          </div>
          <div>
            <FieldLabel>Nº de refeições grandes</FieldLabel>
            <StyledInput value={numGrandes} onChange={setNumGrandes} placeholder="3" step="1" min="0" max="10" />
            <HelperText>Ex: café da manhã, almoço, jantar</HelperText>
          </div>
          <div>
            <FieldLabel>Nº de refeições pequenas</FieldLabel>
            <StyledInput value={numPequenas} onChange={setNumPequenas} placeholder="3" step="1" min="0" max="10" />
            <HelperText>Ex: lanches intermediários</HelperText>
          </div>
          <div>
            <FieldLabel>% das kcal nas refeições grandes</FieldLabel>
            <StyledInput value={percDistGrandes} onChange={setPercDistGrandes} placeholder="70" step="1" min="0" max="100" />
            <HelperText>O restante vai para as refeições pequenas</HelperText>
          </div>
        </div>
      </SectionCard>

      {erro && <Alert type="error" title="Erro" message={erro} />}

      <div className="flex gap-3">
        <button
          onClick={calcular}
          className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          🔢 Calcular distribuição
        </button>
      </div>

      {macrosTotais && (
        <>
          <SectionCard emoji="📊" title="2. Totais diários">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ResultCard label="Total ajustado" value={totalAjustado} unit="kcal" highlight />
              <ResultCard label="Proteína" value={`${macrosTotais.proteina}g`} unit={`${(macrosTotais.proteina / peso).toFixed(2)} g/kg`} />
              <ResultCard label="Carboidrato" value={`${macrosTotais.carboidrato}g`} unit={`${(macrosTotais.carboidrato / peso).toFixed(2)} g/kg`} />
              <ResultCard label="Gordura" value={`${macrosTotais.gordura}g`} unit={`${(macrosTotais.gordura / peso).toFixed(2)} g/kg`} />
            </div>
          </SectionCard>

          {refeicoes && (refeicoes.grandes.length > 0 || refeicoes.pequenas.length > 0) && (
            <SectionCard emoji="🍽️" title="3. Ajuste por refeição">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-slate-500">Edite os valores diretamente na tabela. Os outros campos do mesmo tipo serão ajustados automaticamente.</p>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none whitespace-nowrap ml-4">
                  <input
                    type="checkbox"
                    checked={redistribuirAuto}
                    onChange={(e) => setRedistribuirAuto(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-600"
                  />
                  Redistribuição automática
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left pb-3 text-slate-600 font-medium pr-4">Refeição</th>
                      <th className="text-center pb-3 text-slate-600 font-medium px-2">Carboidrato (g)</th>
                      <th className="text-center pb-3 text-slate-600 font-medium px-2">Proteína (g)</th>
                      <th className="text-center pb-3 text-slate-600 font-medium px-2">Gordura (g)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refeicoes.grandes.map((r, i) => (
                      <tr key={`g${i}`} className="border-b border-slate-100">
                        <td className="py-2 pr-4 text-slate-700">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                            Grande {i + 1}
                          </span>
                        </td>
                        {(['carb', 'prot', 'gord'] as (keyof RefeicaoMacros)[]).map((campo) => (
                          <td key={campo} className="py-2 px-2">
                            <input
                              type="number"
                              value={r[campo]}
                              onChange={(e) => atualizarRefeicao('grandes', i, campo, e.target.value)}
                              className="w-full text-center px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-900
                                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                    {refeicoes.pequenas.length > 0 && (
                      <tr><td colSpan={4} className="pt-4 pb-1"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Refeições pequenas</span></td></tr>
                    )}
                    {refeicoes.pequenas.map((r, i) => (
                      <tr key={`p${i}`} className="border-b border-slate-100">
                        <td className="py-2 pr-4 text-slate-700">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                            Pequena {i + 1}
                          </span>
                        </td>
                        {(['carb', 'prot', 'gord'] as (keyof RefeicaoMacros)[]).map((campo) => (
                          <td key={campo} className="py-2 px-2">
                            <input
                              type="number"
                              value={r[campo]}
                              onChange={(e) => atualizarRefeicao('pequenas', i, campo, e.target.value)}
                              className="w-full text-center px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-900
                                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={copiar}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  {copiado ? '✓ Copiado!' : '📋 Copiar plano completo'}
                </button>
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab: Regra de Três ───────────────────────────────────────────────────────

function TabRegraDeTres() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  const calcular = () => {
    setErro('');
    const vA = parseFloat(a), vB = parseFloat(b), vC = parseFloat(c);
    if (isNaN(vA) || isNaN(vB) || isNaN(vC)) { setErro('Insira apenas números válidos.'); return; }
    if (vA === 0) { setErro('O valor A não pode ser zero.'); return; }
    setResultado(((vB * vC) / vA).toFixed(2));
  };

  return (
    <SectionCard emoji="🔢" title="Calculadora de Regra de Três">
      <div className="max-w-lg space-y-5">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <FieldLabel>Valor A</FieldLabel>
            <StyledInput value={a} onChange={setA} placeholder="Ex: 100" type="number" />
          </div>
          <span className="mb-2.5 text-sm text-slate-400 whitespace-nowrap">está para</span>
          <div className="flex-1">
            <FieldLabel>Valor B</FieldLabel>
            <StyledInput value={b} onChange={setB} placeholder="Ex: 200" type="number" />
          </div>
        </div>
        <p className="text-sm text-slate-400 text-center font-medium">assim como</p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <FieldLabel>Valor C</FieldLabel>
            <StyledInput value={c} onChange={setC} placeholder="Ex: 50" type="number" />
          </div>
          <span className="mb-2.5 text-sm text-slate-400 whitespace-nowrap">está para</span>
          <div className="flex-1">
            <FieldLabel>Resultado (X)</FieldLabel>
            <div className="w-full px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold text-sm min-h-[38px]">
              {resultado ?? '—'}
            </div>
          </div>
        </div>

        {erro && <Alert type="error" title="Erro" message={erro} />}

        <div className="flex gap-3">
          <button
            onClick={calcular}
            className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Calcular
          </button>
          <button
            onClick={() => { setA(''); setB(''); setC(''); setResultado(null); setErro(''); }}
            className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Limpar
          </button>
        </div>

        <Alert
          type="info"
          message="💡 Útil para converter unidades de alimentos, ajustar receitas, calcular proporções de suplementos e muito mais."
        />
      </div>
    </SectionCard>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const TABS = [
  { id: 'calorias', label: '1. Necessidade Calórica', emoji: '🔥' },
  { id: 'macros', label: '2. Distribuição de Dieta', emoji: '🥗' },
  { id: 'regra3', label: 'Regra de Três', emoji: '🔢' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function CalculadoraPage() {
  const [activeTab, setActiveTab] = useState<TabId>('calorias');
  const [caloriasParaMacros, setCaloriasParaMacros] = useState<number>();
  const [pesoParaMacros, setPesoParaMacros] = useState<number>();

  const handleAvancar = (resultado: ResultadoCalorias, peso: number) => {
    setCaloriasParaMacros(resultado.caloriasObjetivo);
    setPesoParaMacros(peso);
    setActiveTab('macros');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <PageHeader
        title="Calculadora Nutricional"
        description="Cálculo de TMB, necessidade calórica e distribuição de macronutrientes"
      />

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Tab navigation */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-1.5 flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.emoji}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'calorias' && <TabCalorias onAvancar={handleAvancar} />}
        {activeTab === 'macros' && <TabMacros caloriasIniciais={caloriasParaMacros} pesoInicial={pesoParaMacros} />}
        {activeTab === 'regra3' && <TabRegraDeTres />}
      </div>
    </div>
  );
}