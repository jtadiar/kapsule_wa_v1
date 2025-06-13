import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate(-1)}
      className={`text-primary hover:text-primary-hover transition-colors flex items-center gap-1 ${className}`}
    >
      <ChevronLeft size={24} />
      <span>Back</span>
    </button>
  );
};

export default BackButton;