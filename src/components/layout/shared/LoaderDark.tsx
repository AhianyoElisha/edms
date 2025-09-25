import { useState, useEffect } from 'react';
import Image from "next/image";

const LoaderDark = () => {
  const [systemMode, setSystemMode] = useState<string | null>(null); // Default to 'light' or whatever default you prefer

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedMode = localStorage.getItem('flow-mineral-water-mui-template-mode');
      if (storedMode) {
        setSystemMode(storedMode);
      }
    }
  }, []);

  return (
    <div className="flex-center w-full">
      <Image
        src={systemMode === 'dark' ? `/images/cards/loader.svg` : `/images/cards/loaderdark.svg`}
        alt="loader"
        width={24}
        height={24}
        className="animate-spin"
      />
    </div>
  );
};

export default LoaderDark;