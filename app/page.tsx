import Link from 'next/link';
import { Users, FileText, Settings, ClipboardList, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Boas-vindas */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Bem-vinda de volta, Carolina! 👋</h1>
          <p className="text-lg text-slate-600">
            Selecione uma área abaixo para iniciar seus atendimentos de hoje.
          </p>
        </div>

        {/* Grid de Acesso Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card: Pacientes */}
          <Link href="/pacientes" className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center justify-between">
              Pacientes
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </h2>
            <p className="text-slate-600 text-sm">
              Buscar, editar e cadastrar novos pacientes no sistema.
            </p>
          </Link>

          {/* Card: Anamneses (NOVO / CORRIGIDO) */}
          <Link href="/anamneses/nova" className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ClipboardList className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center justify-between">
              Nova Anamnese
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </h2>
            <p className="text-slate-600 text-sm">
              Registrar nova consulta, avaliação e recordatório.
            </p>
          </Link>

          {/* Card: Prescrições */}
          <Link href="/prescricoes" className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center justify-between">
              Prescrições
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </h2>
            <p className="text-slate-600 text-sm">
              Histórico de dietas, geração de PDFs e novas prescrições.
            </p>
          </Link>

          {/* Card: Condutas */}
          <Link href="/configuracoes" className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-200 transition-all">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Settings className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center justify-between">
              Pré-Configurações
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-orange-600 transition-colors" />
            </h2>
            <p className="text-slate-600 text-sm">
              Gerenciar blocos de texto, condutas e tabelas fixas.
            </p>
          </Link>

        </div>
      </div>
    </div>
  );
}