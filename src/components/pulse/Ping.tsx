import React, { useState, useEffect } from 'react';
import './style.css';

interface PingProps {
  message: string;
  duration?: number;
}

const Ping: React.FC<PingProps> = ({ message, duration = 3000 }) => {
  const [isPulsing, setIsPulsing] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsPulsing(false);
    }, duration);

    return () => clearTimeout(timeoutId);
  }, [duration]);

  return (
    <div className={`ping ${isPulsing ? 'pulsing' : ''}`}>
      {message}
    </div>
  );
};

export default Ping;