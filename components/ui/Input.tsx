import React from 'react';
import { cn } from '../../lib/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="text-[10px] tracking-caps uppercase text-muted block mb-2">
          {label}
        </label>
      )}
      <input id={inputId} className={cn('terminal-input', className)} {...props} />
    </div>
  );
}
