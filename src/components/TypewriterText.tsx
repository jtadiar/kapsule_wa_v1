import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 100,
  delay = 0,
  className = '',
  onComplete,
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDelaying, setIsDelaying] = useState(true);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isDelaying) {
      timer = setTimeout(() => {
        setIsDelaying(false);
      }, delay);
    } else if (currentIndex < text.length) {
      timer = setTimeout(() => {
        setDisplayText(text.substring(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);
    } else if (onComplete) {
      onComplete();
    }

    return () => clearTimeout(timer);
  }, [currentIndex, isDelaying, text, speed, delay, onComplete]);

  return <p className={`${className}`}>{displayText}</p>;
};

export default TypewriterText;