import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
}

export function PageHeader({ title, description, backHref = '/' }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-2xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {description && (
              <p className="text-slate-600 text-sm mt-1">{description}</p>
            )}
          </div>
          {backHref && (
            <Link
              href={backHref}
              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors"
            >
              ← Voltar
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

interface AlertProps {
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

export function Alert({ type, title, message }: AlertProps) {
  const styles = {
    success: {
      container: 'bg-green-50 border-green-200',
      text: 'text-green-700',
      icon: '✓',
    },
    error: {
      container: 'bg-red-50 border-red-200',
      text: 'text-red-700',
      icon: '✗',
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      icon: 'ℹ',
    },
  };

  const style = styles[type];

  return (
    <div
      className={`${style.container} border rounded-lg p-4 ${style.text} flex items-center gap-3`}
    >
      <span className="text-xl">{style.icon}</span>
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <p className={title ? 'text-sm' : ''}>{message}</p>
      </div>
    </div>
  );
}
