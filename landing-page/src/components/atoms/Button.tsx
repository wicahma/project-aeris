import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
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
  const baseStyles = 'inline-flex items-center justify-center font-mono font-semibold transition-all duration-200 border-2 rounded-md active:translate-x-0.5 active:translate-y-0.5';
  
  const variants = {
    primary: 'bg-brand-primary text-white border-white shadow-neubrutalism hover:-translate-y-0.5 hover:-translate-x-0.5',
    secondary: 'bg-brand-accent text-dark-bg border-white shadow-neubrutalism-green hover:-translate-y-0.5 hover:-translate-x-0.5',
    outline: 'bg-dark-card text-white border-dark-border hover:border-brand-primary hover:text-brand-primary shadow-neubrutalism-dark'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base'
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