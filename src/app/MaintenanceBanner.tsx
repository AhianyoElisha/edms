import React from 'react';

const MaintenanceBanner = () => {
  return (
    <div className="w-full p-2 text-white text-center font-bold mb-5"
         style={{
           background: 'linear-gradient(90deg, #FF416C 0%, #FF4B2B 100%)',
         }}>
      This site is under construction and maintenance
    </div>
  );
};

export default MaintenanceBanner;