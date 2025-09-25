import React from 'react';
import Marquee from 'react-fast-marquee'

const AttentionBanner = ({children }: {children: React.ReactNode}) => {
  return (
    <Marquee style={{
      zIndex: 'var(--mui-zIndex-fab)',
      position: 'fixed',
      insetInlineEnd: 0,
      insetBlockEnd: 0,
      padding: 4,
      fontWeight: 'bold',
      fontSize: 16,
      background: 'linear-gradient(90deg, #FF416C 0%, #FF4B2B 100%)',
    }}>
      {children}
    </Marquee>
  );
};

export default AttentionBanner;