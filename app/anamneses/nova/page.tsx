'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { AnamneseFormData } from '@/types/database.types';
import { usePacientes } from '@/hooks/useDatabase';
import { PageHeader, Alert, FormInput, FormTextarea, FormSelect } from '@/components';

export default function NovaAnamnese() {
  const { pacientes, loading: loadingPacientes } = usePacientes();

  const [formData, setFormData] = useState<AnamneseFormData>({
    paciente_id: '',
    altura: undefined,
    peso_atual: undefined,
    peso_historico: undefined,
    peso_desejado: undefined,
    indicacao: '',
    sobre_o_paciente: '',
    exames_com_alteracao: '',
    objetivos: '',
    queixas: '',
    medicamentos_em_uso: '',
    suplementos_em_uso: '',
    atividade_fisica: '',
    recordatorio_alimentar: '',
    gostos: '',
    aversoes: '',
    conduta: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle mudanças no formulário
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Converter valores numéricos para número
    if (['altura', 'peso_atual', 'peso_historico', 'peso_desejado'].includes(name)) {
      setFormData((prev) => ({
        ...prev,
        [name]: value ? parseFloat(value) : undefined,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Validar formulário
  const validarFormulario = (): boolean => {
    if (!formData.paciente_id) {
      setError('Por favor, selecione um paciente');
      return false;
    }

    // Validar pesos se preenchidos
    if (formData.peso_atual && (formData.peso_atual < 20 || formData.peso_atual > 300)) {
      setError('Peso atual deve estar entre 20 e 300 kg');
      return false;
    }

    if (formData.peso_historico && (formData.peso_historico < 20 || formData.peso_historico > 300)) {
      setError('Peso histórico deve estar entre 20 e 300 kg');
      return false;
    }

    if (formData.peso_desejado && (formData.peso_desejado < 20 || formData.peso_desejado > 300)) {
      setError('Peso desejado deve estar entre 20 e 300 kg');
      return false;
    }

    // Validar altura se preenchida
    if (formData.altura && (formData.altura < 1.0 || formData.altura > 2.5)) {
      setError('Altura deve estar entre 1.0 e 2.5 metros');
      return false;
    }

    return true;
  };

  // Salvar anamnese
  const handleSaveAnamnese = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validarFormulario()) {
      return;
    }

    try {
      setLoading(true);

      // Preparar dados para insert (remover campos undefined)
      const dataToInsert = {
        paciente_id: formData.paciente_id,
        ...(formData.altura && { altura: formData.altura }),
        ...(formData.peso_atual && { peso_atual: formData.peso_atual }),
        ...(formData.peso_historico && { peso_historico: formData.peso_historico }),
        ...(formData.peso_desejado && { peso_desejado: formData.peso_desejado }),
        ...(formData.indicacao && { indicacao: formData.indicacao.trim() }),
        ...(formData.sobre_o_paciente && { sobre_o_paciente: formData.sobre_o_paciente.trim() }),
        ...(formData.exames_com_alteracao && { exames_com_alteracao: formData.exames_com_alteracao.trim() }),
        ...(formData.objetivos && { objetivos: formData.objetivos.trim() }),
        ...(formData.queixas && { queixas: formData.queixas.trim() }),
        ...(formData.medicamentos_em_uso && { medicamentos_em_uso: formData.medicamentos_em_uso.trim() }),
        ...(formData.suplementos_em_uso && { suplementos_em_uso: formData.suplementos_em_uso.trim() }),
        ...(formData.atividade_fisica && { atividade_fisica: formData.atividade_fisica.trim() }),
        ...(formData.recordatorio_alimentar && { recordatorio_alimentar: formData.recordatorio_alimentar.trim() }),
        ...(formData.gostos && { gostos: formData.gostos.trim() }),
        ...(formData.aversoes && { aversoes: formData.aversoes.trim() }),
        ...(formData.conduta && { conduta: formData.conduta.trim() }),
      };

      const { error: insertError } = await supabase
        .from('anamneses')
        .insert([dataToInsert]);

      if (insertError) throw insertError;

      setSuccess(true);
      // Limpar formulário
      setFormData({
        paciente_id: '',
        altura: undefined,
        peso_atual: undefined,
        peso_historico: undefined,
        peso_desejado: undefined,
        indicacao: '',
        sobre_o_paciente: '',
        exames_com_alteracao: '',
        objetivos: '',
        queixas: '',
        medicamentos_em_uso: '',
        suplementos_em_uso: '',
        atividade_fisica: '',
        recordatorio_alimentar: '',
        gostos: '',
        aversoes: '',
        conduta: '',
      });

      // Redirecionar após 2 segundos
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar anamnese';
      setError(message);
      console.error('Erro ao salvar anamnese:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <PageHeader
        title="Nova Anamnese / Ficha de Atendimento"
        description="Preencha os dados clínicos e antropométricos do paciente"
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSaveAnamnese} className="space-y-6">
          {/* Alert de Sucesso */}
          {success && (
            <Alert
              type="success"
              title="Anamnese registrada com sucesso!"
              message="Redirecionando para a página inicial..."
            />
          )}

          {/* Alert de Erro */}
          {error && (
            <Alert
              type="error"
              title="Erro ao registrar"
              message={error}
            />
          )}

          {/* Section: Seleção de Paciente */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">👤</span>
              Paciente
            </h2>

            <FormSelect
              name="paciente_id"
              value={formData.paciente_id}
              onChange={handleInputChange}
              label="Selecione o Paciente *"
              options={pacientes.map((p) => ({
                value: p.id,
                label: p.nome_completo,
              }))}
              disabled={loading || loadingPacientes}
            />
          </div>

          {/* Section: Dados Antropométricos */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">⚖️</span>
              Dados Antropométricos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Altura */}
              <FormInput
                type="number"
                name="altura"
                value={formData.altura?.toString() || ''}
                onChange={handleInputChange}
                label="Altura (m)"
                placeholder="Ex: 1.65"
                step="0.01"
                min="1.0"
                max="2.5"
                helperText="Exemplo: 1.65 metros"
                disabled={loading}
              />

              {/* Peso Atual */}
              <FormInput
                type="number"
                name="peso_atual"
                value={formData.peso_atual?.toString() || ''}
                onChange={handleInputChange}
                label="Peso Atual (kg)"
                placeholder="Ex: 75.5"
                step="0.1"
                min="20"
                max="300"
                helperText="Peso A - medido no dia da consulta"
                disabled={loading}
              />

              {/* Peso Histórico */}
              <FormInput
                type="number"
                name="peso_historico"
                value={formData.peso_historico?.toString() || ''}
                onChange={handleInputChange}
                label="Peso Histórico (kg)"
                placeholder="Ex: 85.0"
                step="0.1"
                min="20"
                max="300"
                helperText="Peso H - peso anterior ou de referência"
                disabled={loading}
              />

              {/* Peso Desejado */}
              <FormInput
                type="number"
                name="peso_desejado"
                value={formData.peso_desejado?.toString() || ''}
                onChange={handleInputChange}
                label="Peso Desejado (kg)"
                placeholder="Ex: 65.0"
                step="0.1"
                min="20"
                max="300"
                helperText="Peso D - meta de peso do paciente"
                disabled={loading}
              />
            </div>
          </div>

          {/* Section: Avaliação Clínica */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">🏥</span>
              Avaliação Clínica
            </h2>

            <div className="space-y-5">
              {/* Indicação */}
              <FormTextarea
                name="indicacao"
                value={formData.indicacao}
                onChange={handleInputChange}
                label="Indicação"
                placeholder="Ex: Emagrecimento, Controle de Diabetes, Hipertensão..."
                rows={2}
                helperText="Motivo principal da consulta"
                disabled={loading}
              />

              {/* Sobre o Paciente */}
              <FormTextarea
                name="sobre_o_paciente"
                value={formData.sobre_o_paciente}
                onChange={handleInputChange}
                label="Sobre o Paciente"
                placeholder="Ex: Sedentário, trabalha muito, dorme pouco..."
                rows={2}
                helperText="Informações gerais sobre o estilo de vida"
                disabled={loading}
              />

              {/* Exames com Alteração */}
              <FormTextarea
                name="exames_com_alteracao"
                value={formData.exames_com_alteracao}
                onChange={handleInputChange}
                label="Exames com Alteração"
                placeholder="Ex: Colesterol alto, triglicerídeos elevados..."
                rows={2}
                helperText="Listе os exames laboratoriais alterados"
                disabled={loading}
              />

              {/* Objetivos */}
              <FormTextarea
                name="objetivos"
                value={formData.objetivos}
                onChange={handleInputChange}
                label="Objetivos"
                placeholder="Ex: Perder 10kg em 3 meses, equilibrar colesterol..."
                rows={2}
                helperText="Metas estabelecidas com o paciente"
                disabled={loading}
              />

              {/* Queixas */}
              <FormTextarea
                name="queixas"
                value={formData.queixas}
                onChange={handleInputChange}
                label="Queixas"
                placeholder="Ex: Cansaço, inchaço, dores nas pernas..."
                rows={2}
                helperText="Sintomas relatados pelo paciente"
                disabled={loading}
              />

              {/* Conduta */}
              <FormTextarea
                name="conduta"
                value={formData.conduta}
                onChange={handleInputChange}
                label="Conduta / Plano de Ação"
                placeholder="Ex: Dieta de 1800 calorias, aumentar atividade física..."
                rows={3}
                helperText="Resumo da conduta profissional definida"
                disabled={loading}
              />
            </div>
          </div>

          {/* Section: Rotina e Hábitos */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Rotina e Hábitos
            </h2>

            <div className="space-y-5">
              {/* Medicamentos em Uso */}
              <FormTextarea
                name="medicamentos_em_uso"
                value={formData.medicamentos_em_uso}
                onChange={handleInputChange}
                label="Medicamentos em Uso"
                placeholder="Ex: Metformina 500mg 2x ao dia, Losartana 50mg..."
                rows={2}
                helperText="Liste todos os medicamentos que o paciente utiliza"
                disabled={loading}
              />

              {/* Suplementos em Uso */}
              <FormTextarea
                name="suplementos_em_uso"
                value={formData.suplementos_em_uso}
                onChange={handleInputChange}
                label="Suplementos em Uso"
                placeholder="Ex: Vitamina D, Ômega 3, Whey Protein..."
                rows={2}
                helperText="Suplementos e vitaminas utilizados"
                disabled={loading}
              />

              {/* Atividade Física */}
              <FormTextarea
                name="atividade_fisica"
                value={formData.atividade_fisica}
                onChange={handleInputChange}
                label="Atividade Física"
                placeholder="Ex: Caminha 3x semana, faz musculação..."
                rows={2}
                helperText="Descrição do nível de atividade física e tipo de exercício"
                disabled={loading}
              />

              {/* Recordatório Alimentar */}
              <FormTextarea
                name="recordatorio_alimentar"
                value={formData.recordatorio_alimentar}
                onChange={handleInputChange}
                label="Recordatório Alimentar (24h)"
                placeholder="Ex: Café: pão com manteiga e café com leite. Almoço: arroz, feijão, carne..."
                rows={3}
                helperText="Descreva tudo o que o paciente comeu nas últimas 24 horas"
                disabled={loading}
              />

              {/* Gostos */}
              <FormTextarea
                name="gostos"
                value={formData.gostos}
                onChange={handleInputChange}
                label="Gostos / Alimentos Preferidos"
                placeholder="Ex: Macarrão, chocolate, frutas vermelhas..."
                rows={2}
                helperText="Alimentos que o paciente gosta"
                disabled={loading}
              />

              {/* Aversões */}
              <FormTextarea
                name="aversoes"
                value={formData.aversoes}
                onChange={handleInputChange}
                label="Aversões / Alimentos que não gosta"
                placeholder="Ex: Brócolis, peixe, ovos..."
                rows={2}
                helperText="Alimentos que o paciente rejeita"
                disabled={loading}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Link
              href="/"
              className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Salvando...
                </>
              ) : (
                <>
                  ✓ Salvar Anamnese
                </>
              )}
            </button>
          </div>

          {/* Info Box */}
          <Alert
            type="info"
            message="💡 Dica: Preencha os dados com cuidado. A anamnese será fundamental para o plano alimentar. Campos sem asterisco são opcionais."
          />
        </form>
      </div>
    </div>
  );
}
