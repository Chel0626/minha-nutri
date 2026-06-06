'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PacienteFormData } from '@/types/database.types';
import { PageHeader, Alert, FormInput, FormTextarea } from '@/components';

export default function NovoPaciente() {
  const [formData, setFormData] = useState<PacienteFormData>({
    nome_completo: '',
    data_nascimento: '',
    cpf: '',
    telefone: '',
    email: '',
    endereco_completo: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle mudanças no formulário
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Formatar Telefone
  const formatTelefone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTelefone(e.target.value);
    setFormData((prev) => ({
      ...prev,
      telefone: formatted,
    }));
  };

  // Formatar CPF
  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData((prev) => ({
      ...prev,
      cpf: formatted,
    }));
  };

  // Validar CPF
  const validarCPF = (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');
    
    // Verificar se tem 11 dígitos
    if (cleaned.length !== 11) return false;

    // Verificar se não é sequência repetida
    if (/^(\d)\1{10}$/.test(cleaned)) return false;

    // Validar primeiro dígito verificador
    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

    // Validar segundo dígito verificador
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

    return true;
  };

  // Validar E-mail
  const validarEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validar Telefone
  const validarTelefone = (telefone: string): boolean => {
    const cleaned = telefone.replace(/\D/g, '');
    // Aceita 10 ou 11 dígitos (celular ou fixo)
    return cleaned.length === 10 || cleaned.length === 11;
  };

  // Validar formulário
  const validarFormulario = (): boolean => {
    if (!formData.nome_completo.trim()) {
      setError('Nome completo é obrigatório');
      return false;
    }

    if (!formData.data_nascimento) {
      setError('Data de nascimento é obrigatória');
      return false;
    }

    // Validar formato de data
    const data = new Date(formData.data_nascimento);
    if (isNaN(data.getTime())) {
      setError('Data inválida');
      return false;
    }

    // Validar se não é data futura
    if (data > new Date()) {
      setError('Data de nascimento não pode ser no futuro');
      return false;
    }

    // Validar CPF se foi preenchido
    if (formData.cpf && formData.cpf.trim()) {
      if (!validarCPF(formData.cpf)) {
        setError('CPF inválido');
        return false;
      }
    }

    // Validar E-mail se foi preenchido
    if (formData.email && formData.email.trim()) {
      if (!validarEmail(formData.email)) {
        setError('E-mail inválido');
        return false;
      }
    }

    // Validar Telefone se foi preenchido
    if (formData.telefone && formData.telefone.trim()) {
      if (!validarTelefone(formData.telefone)) {
        setError('Telefone inválido (use 10 ou 11 dígitos)');
        return false;
      }
    }

    return true;
  };

  // Salvar paciente
  const handleSavePaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validarFormulario()) {
      return;
    }

    try {
      setLoading(true);

      const dataToInsert = {
        nome_completo: formData.nome_completo.trim(),
        data_nascimento: formData.data_nascimento,
        ...(formData.cpf && { cpf: formData.cpf.replace(/\D/g, '') }),
        ...(formData.telefone && { telefone: formData.telefone.replace(/\D/g, '') }),
        ...(formData.email && { email: formData.email.trim() }),
        ...(formData.endereco_completo && { endereco_completo: formData.endereco_completo.trim() }),
      };

      const { error: insertError } = await supabase
        .from('pacientes')
        .insert([dataToInsert]);

      if (insertError) throw insertError;

      setSuccess(true);
      // Limpar formulário
      setFormData({
        nome_completo: '',
        data_nascimento: '',
        cpf: '',
        telefone: '',
        email: '',
        endereco_completo: '',
      });

      // Redirecionar após 2 segundos
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar paciente';
      setError(message);
      console.error('Erro ao salvar paciente:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <PageHeader
        title="Cadastrar Novo Paciente"
        description="Preencha os dados do paciente para registrá-lo no sistema"
      />

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSavePaciente} className="space-y-6">
          {/* Alert de Sucesso */}
          {success && (
            <Alert
              type="success"
              title="Paciente cadastrado com sucesso!"
              message="Redirecionando para a página inicial..."
            />
          )}

          {/* Alert de Erro */}
          {error && (
            <Alert
              type="error"
              title="Erro ao cadastrar"
              message={error}
            />
          )}

          {/* Card do Formulário */}
          <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
            {/* Section: Informações Pessoais */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <span className="text-2xl">👤</span>
                Informações Pessoais
              </h2>

              <div className="space-y-5">
                {/* Nome Completo */}
                <FormInput
                  type="text"
                  name="nome_completo"
                  value={formData.nome_completo}
                  onChange={handleInputChange}
                  label="Nome Completo *"
                  placeholder="Ex: Carolina Silva Santos"
                  disabled={loading}
                />

                {/* Data de Nascimento */}
                <FormInput
                  type="date"
                  name="data_nascimento"
                  value={formData.data_nascimento}
                  onChange={handleInputChange}
                  label="Data de Nascimento *"
                  disabled={loading}
                />

                {/* CPF */}
                <FormInput
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleCPFChange}
                  label="CPF"
                  placeholder="000.000.000-00"
                  helperText="Número único para identificação (validação automática)"
                  disabled={loading}
                />

              {/* Telefone */}
              <FormInput
                type="tel"
                name="telefone"
                value={formData.telefone}
                onChange={handleTelefoneChange}
                label="Telefone"
                placeholder="(11) 98765-4321"
                helperText="10 ou 11 dígitos com formatação automática"
                disabled={loading}
              />

              {/* E-mail */}
              <FormInput
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                label="E-mail"
                placeholder="carolina@exemplo.com"
                helperText="Para futuro contato e login"
                disabled={loading}
              />

              {/* Endereço Completo */}
              <FormTextarea
                name="endereco_completo"
                value={formData.endereco_completo}
                onChange={handleInputChange}
                label="Endereço Completo"
                placeholder="Rua/Avenida, Número, Complemento, Cidade, Estado, CEP"
                rows={3}
                disabled={loading}
              />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 mt-8 pt-6 border-t border-slate-200">
              <Link
                href="/"
                className="px-6 py-3 bg-slate-200 text-slate-900 font-medium rounded-lg hover:bg-slate-300 transition-colors"
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
                    ✓ Salvar Paciente
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Box */}
          <Alert
            type="info"
            message="💡 Dica: Os campos com * são obrigatórios. Após salvar, você poderá criar anamneses (fichas de atendimento) para este paciente."
          />
        </form>
      </div>
    </div>
  );
}
