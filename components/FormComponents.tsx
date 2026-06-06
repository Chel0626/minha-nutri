import React from 'react';

interface FormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-3 border ${
            error ? 'border-red-300' : 'border-slate-300'
          } rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
            error ? 'focus:ring-red-500' : 'focus:ring-emerald-500'
          } focus:border-transparent transition-colors ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-slate-500 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const FormTextarea = React.forwardRef<
  HTMLTextAreaElement,
  FormTextareaProps
>(({ label, error, helperText, className = '', ...props }, ref) => {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`w-full px-4 py-3 border ${
          error ? 'border-red-300' : 'border-slate-300'
        } rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
          error ? 'focus:ring-red-500' : 'focus:ring-emerald-500'
        } focus:border-transparent transition-colors resize-none ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-slate-500 mt-1">{helperText}</p>
      )}
    </div>
  );
});

FormTextarea.displayName = 'FormTextarea';

interface FormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, helperText, options, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-4 py-3 border ${
            error ? 'border-red-300' : 'border-slate-300'
          } rounded-lg text-slate-900 focus:outline-none focus:ring-2 ${
            error ? 'focus:ring-red-500' : 'focus:ring-emerald-500'
          } focus:border-transparent transition-colors bg-white ${className}`}
          {...props}
        >
          <option value="">Selecione uma opção</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-slate-500 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';
