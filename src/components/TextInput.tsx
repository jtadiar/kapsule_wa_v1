import React from 'react';

interface TextInputProps {
  type?: 'text' | 'email' | 'password';
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
  error?: string;
  label?: string;
  hint?: string;
}

const TextInput: React.FC<TextInputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  name,
  error,
  label,
  hint,
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="block text-gray-200 mb-1 text-sm">
          {label}
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full bg-gray-800 border ${
          error ? 'border-primary' : 'border-gray-700'
        } rounded-lg p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary`}
      />
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-primary">{error}</p>}
    </div>
  );
};

export default TextInput;