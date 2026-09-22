import type { ButtonHTMLAttributes } from 'react'

interface IIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export function IconButton({ active, className = '', ...props }: IIconButtonProps) {
  return (
    <button
      {...props}
      className={`rounded-control px-2 py-1 text-xs transition-colors disabled:opacity-40 ${
        active ? 'bg-selection text-heading' : 'text-muted hover:bg-hover hover:text-text'
      } ${className}`}
    />
  )
}
