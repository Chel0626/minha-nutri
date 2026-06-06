'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Determinar saudação baseado na hora do dia
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Bom dia');
    } else if (hour < 18) {
      setGreeting('Boa tarde');
    } else {
      setGreeting('Boa noite');
    }
  }, []);

  const quickActions = [
    {
      id: 1,
      icon: '👤',
      title: 'Cadastrar Paciente',
      description: 'Adicionar novo paciente ao sistema',
      href: '/pacientes/novo',
      color: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      accentColor: 'bg-blue-500',
    },
    {
      id: 2,
      icon: '�',
      title: 'Nova Anamnese / Consulta',
      description: 'Registrar ficha de atendimento',
      href: '/anamneses/nova',
      color: 'from-emerald-50 to-emerald-100',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-700',
      accentColor: 'bg-emerald-500',
    },
    {
      id: 3,
      icon: '🍽️',
      title: 'Criar Prescrição',
      description: 'Montar dieta e gerar PDF',
      href: '/prescricoes/nova',
      color: 'from-orange-50 to-orange-100',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-700',
      accentColor: 'bg-orange-500',
    },
    {
      id: 4,
      icon: '⚙️',
      title: 'Pré-Configurações',
      description: 'Gerenciar blocos de orientações',
      href: '/configuracoes',
      color: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      accentColor: 'bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
      {/* Header com design minimalista */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Bem-vinda de volta, <span className="text-emerald-600">Carolina!</span>
            </h1>
            <p className="text-slate-600 text-base">
              {greeting && `${greeting}! `}Aqui está tudo o que você precisa para atender seus pacientes.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Section Title com ícone */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-6 bg-emerald-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-slate-900">
              Ações Rápidas
            </h2>
          </div>
          <p className="text-slate-600 text-sm ml-4">
            Comece digitando o que você precisa fazer
          </p>
        </div>

        {/* Grid de Cards Modernos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="group relative"
            >
              {/* Card Background com gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${action.color} rounded-xl border ${action.borderColor} transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1`}
              />

              {/* Card Content */}
              <div className="relative p-6 h-full flex flex-col">
                {/* Accent Line */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${action.accentColor} rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                {/* Icon */}
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 origin-top-left">
                  {action.icon}
                </div>

                {/* Title */}
                <h3 className={`${action.textColor} font-bold text-lg mb-2 group-hover:translate-x-1 transition-transform duration-300`}>
                  {action.title}
                </h3>

                {/* Description */}
                <p className="text-slate-600 text-sm leading-relaxed flex-grow">
                  {action.description}
                </p>

                {/* Footer com arrow */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-current border-opacity-10">
                  <span className={`text-xs font-medium ${action.textColor} opacity-60`}>
                    Clique para acessar
                  </span>
                  <div className={`${action.textColor} text-xl opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300`}>
                    →
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats Section (Opcional) */}
        <div className="mt-16 pt-12 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-6">Resumo Rápido</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Pacientes', value: '0', icon: '👥' },
              { label: 'Prescrições', value: '0', icon: '📋' },
              { label: 'Este Mês', value: '0', icon: '📅' },
              { label: 'Atualizações', value: 'Ver tudo', icon: '🔔' },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="text-2xl mb-2">{stat.icon}</div>
                <p className="text-xs text-slate-600 mb-1">{stat.label}</p>
                <p className="text-lg font-semibold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer minimalista */}
      <footer className="mt-20 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              © 2024 Plataforma de Nutrição Carolina
            </p>
            <p className="text-xs text-slate-500">
              Sistema exclusivo para gestão nutricional otimizada
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
