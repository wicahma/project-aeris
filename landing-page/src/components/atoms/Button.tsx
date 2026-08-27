import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  href?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  href,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-mono font-bold uppercase tracking-wider transition-all duration-150 border-2 select-none active:translate-x-0.5 active:translate-y-0.5';
  
  const variants = {
    primary: 'bg-indigo-600 text-white border-zinc-100 shadow-[4px_4px_0px_0px_#ffffff] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[6px_6px_0px_0px_#ffffff]',
    secondary: 'bg-emerald-500 text-zinc-950 border-zinc-100 shadow-[4px_4px_0px_0px_#10b981] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[6px_6px_0px_0px_#10b981]',
    outline: 'bg-zinc-900 text-zinc-100 border-zinc-700 shadow-[4px_4px_0px_0px_#3f3f46] hover:border-indigo-500 hover:text-indigo-400 hover:-translate-y-0.5 hover:-translate-x-0.5',
    ghost: 'bg-transparent text-zinc-400 hover:text-white border-transparent hover:border-zinc-700'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-xs sm:text-sm gap-2',
    lg: 'px-7 py-3.5 text-sm sm:text-base gap-2.5'
  };

  const combinedClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <a href={href} className={combinedClasses}>
        {children}
      </a>
    );
  }

  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
};