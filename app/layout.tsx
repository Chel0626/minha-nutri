import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MinhaNutri - Carolina Macedo',
  description: 'Plataforma de Prescrição Nutricional',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-slate-50 min-h-screen flex flex-col`}>
        {/* Barra de Navegação Global - print:hidden esconde na impressão */}
        <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50 print:hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo / Título */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <span className="text-2xl">🍏</span>
                <span className="font-bold text-xl text-slate-800 tracking-tight">
                  Minha<span className="text-emerald-600">Nutri</span>
                </span>
              </div>
              
              {/* Links de Navegação */}
              <div className="hidden md:flex space-x-8">
                <Link href="/" className="text-slate-600 hover:text-emerald-600 font-medium transition-colors">
                  Início
                </Link>
                <Link href="/pacientes" className="text-slate-600 hover:text-emerald-600 font-medium transition-colors">
                  Pacientes
                </Link>
                <Link href="/prescricoes" className="text-slate-600 hover:text-emerald-600 font-medium transition-colors">
                  Prescrições
                </Link>
                <Link href="/configuracoes" className="text-slate-600 hover:text-emerald-600 font-medium transition-colors">
                  Condutas Padrão
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Conteúdo das Páginas vai renderizar aqui dentro */}
        <main className="flex-1">
          {children}
        </main>

        {/* Rodapé Simples - print:hidden esconde na impressão */}
        <footer className="bg-white border-t border-slate-200 py-6 mt-auto print:hidden">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm text-slate-500">
            MinhaNutri © {new Date().getFullYear()} - Uso Exclusivo Carolina Macedo
          </div>
        </footer>
      </body>
    </html>
  );
}