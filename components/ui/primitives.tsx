"use client";
import * as React from 'react';

// Minimal shadcn-like primitives (simplified for MVP)
export const Card = ({ className = '', children }: React.PropsWithChildren<{ className?: string }>) => (
  <div className={"rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm " + className}>{children}</div>
);
export const CardHeader = ({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) => <div className={"p-4 border-b border-neutral-200 dark:border-neutral-800 " + className}>{children}</div>;
export const CardTitle = ({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) => <h2 className={"text-lg font-semibold leading-snug " + className}>{children}</h2>;
export const CardDescription = ({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) => <p className={"text-sm text-neutral-600 dark:text-neutral-400 mt-1 " + className}>{children}</p>;
export const CardContent = ({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) => <div className={"p-4 space-y-4 " + className}>{children}</div>;
export const CardFooter = ({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) => <div className={"p-4 border-t border-neutral-200 dark:border-neutral-800 flex gap-2 flex-wrap " + className}>{children}</div>;

export const Button = ({ children, className = '', variant = 'default', size = 'md', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost'; size?: 'sm' | 'md' | 'lg' }) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus-visible:ring-2 ring-offset-2 ring-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm';
  const variants: Record<string, string> = {
    default: 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white',
    secondary: 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700',
    outline: 'border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800',
    destructive: 'bg-red-600 text-white hover:bg-red-500',
    ghost: 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
  };
  const sizes: Record<string, string> = { sm: 'h-8 px-2', md: 'h-9 px-3', lg: 'h-11 px-4 text-base' };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>{children}</button>;
};

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', ...rest }, ref) {
  return <input ref={ref} className={`w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-neutral-400 ${className}`} {...rest} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className = '', ...rest }, ref) {
  return <textarea ref={ref} className={`w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-neutral-400 resize-vertical ${className}`} {...rest} />;
});

export const Badge = ({ children, className = '', variant = 'default' }: React.PropsWithChildren<{ className?: string; variant?: 'default' | 'secondary' | 'outline' | 'destructive' }>) => {
  const variants: Record<string, string> = {
    default: 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900',
    secondary: 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100',
    outline: 'border border-neutral-300 dark:border-neutral-700',
    destructive: 'bg-red-600 text-white'
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>{children}</span>;
};

export const Progress = ({ value, className = '' }: { value: number; className?: string }) => (
  <div className={`h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden ${className}`} aria-label="progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} role="progressbar">
    <div className="h-full bg-green-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);

export const Separator = ({ className = '' }: { className?: string }) => <div className={`h-px w-full bg-neutral-200 dark:bg-neutral-800 ${className}`} />;

// Very lightweight tooltip (title attr fallback)
export const TooltipIconButton = ({ label, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) => (
  <button {...rest} aria-label={label} title={label} className={`inline-flex items-center justify-center h-8 w-8 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 ring-neutral-400 text-neutral-600 dark:text-neutral-300 ${rest.className || ''}`}>{children}</button>
);

export const Skeleton = ({ className = '' }: { className?: string }) => <div className={`animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800 ${className}`} />;
