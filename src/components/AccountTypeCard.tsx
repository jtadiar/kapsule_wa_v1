import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface AccountTypeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const AccountTypeCard: React.FC<AccountTypeCardProps> = ({
  title,
  description,
  icon,
  onClick,
}) => {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="flex items-center justify-between w-full p-4 bg-gray-800 border border-gray-700 hover:border-primary rounded-xl mb-4 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="text-primary text-2xl">{icon}</div>
        <div>
          <h3 className="text-white font-medium text-lg">{title}</h3>
          <p className="text-gray-300 text-sm">{description}</p>
        </div>
      </div>
      <ChevronRight className="text-primary" size={20} />
    </motion.div>
  );
};

export default AccountTypeCard;