import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  className = '',
  disabled = false,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full max-w-[400px] mx-auto py-4 px-8 bg-primary hover:bg-primary-hover transition-colors duration-200 
        text-white font-medium rounded-full text-lg flex items-center justify-center ${
        disabled ? 'opacity-70 cursor-not-allowed' : ''
      } ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;