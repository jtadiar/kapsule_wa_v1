import React from 'react';

interface SubscriptionFeatureProps {
  icon: React.ReactNode;
  text: string;
}

const SubscriptionFeature: React.FC<SubscriptionFeatureProps> = ({ icon, text }) => {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="text-primary">{icon}</div>
      <span className="text-white">{text}</span>
    </div>
  );
};

export default SubscriptionFeature;