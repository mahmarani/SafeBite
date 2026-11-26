import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#1D7A46] text-white border border-[#1D7A46] hover:bg-[#155D35] hover:border-[#155D35] shadow-xs focus-visible:ring-2 focus-visible:ring-[#1D7A46]/30',
  secondary:
    'bg-[#F3EDE2] text-[#1F1A17] border border-[#E2D8C8] hover:bg-[#EAE1D2] focus-visible:ring-2 focus-visible:ring-[#1D7A46]/25',
  outline:
    'bg-white text-[#1F1A17] border border-[#DED5C6] hover:bg-[#FAF7F2] hover:border-[#C5B9A6] focus-visible:ring-2 focus-visible:ring-[#1D7A46]/25',
  ghost:
    'bg-transparent text-[#1D7A46] border border-transparent hover:bg-[#E9F7EF] focus-visible:ring-2 focus-visible:ring-[#1D7A46]/25',
  danger:
    'bg-[#D43832] text-white border border-[#D43832] hover:bg-[#B22B26] hover:border-[#B22B26] shadow-xs focus-visible:ring-2 focus-visible:ring-[#F7BEBC]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-1.5 text-[13px] min-h-[34px]',
  md: 'px-[18px] py-[10px] text-[14px] min-h-[40px]',
  lg: 'px-6 py-3 text-[15px] min-h-[46px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-[9px] font-semibold whitespace-nowrap shrink-0 transition-all duration-150 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
