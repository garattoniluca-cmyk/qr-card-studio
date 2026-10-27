import { forwardRef } from 'react';

const VARIANTS = {
  primary: 'bg-indigo-600 text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 font-semibold',
  success: 'bg-emerald-600 text-white shadow-md shadow-emerald-100 hover:bg-emerald-700 font-semibold',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium',
  soft: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold',
  ghost: 'text-slate-600 hover:bg-slate-100 font-medium',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 font-semibold',
  'danger-soft': 'bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold',
  warning: 'bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
  icon: 'h-9 w-9 justify-center',
};

/** Pulsante del design system. `variant`: primary | success | secondary | soft | ghost | danger | danger-soft | warning */
export const Button = forwardRef(function Button({ variant = 'secondary', size = 'md', className = '', type = 'button', icon: Icon, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center rounded-control transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {Icon ? <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /> : null}
      {children}
    </button>
  );
});
