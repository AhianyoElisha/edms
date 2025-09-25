"use client";

import Image from "next/image";
import { useState } from "react";

const ProductImages = ({ items }: { items: any }) => {
  const [index, setIndex] = useState(0);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});

  // Function to check if the URL is valid
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Function to handle image error
  const handleImageError = (i: number) => {
    setImgError(prev => ({ ...prev, [i]: true }));
    setImageLoading(prev => ({ ...prev, [i]: false }));
  };

  // Function to handle image load start
  const handleLoadingStart = (i: number) => {
    setImageLoading(prev => ({ ...prev, [i]: true }));
  };

  // Function to handle image load complete
  const handleLoadingComplete = (i: number) => {
    setImageLoading(prev => ({ ...prev, [i]: false }));
  };

  return (
    <div className="">
      <div className="h-[500px] relative">
        {isValidUrl(items[index]?.fileUrl) && !imgError[index] ? (
          <>
            {/* Shimmer effect container */}
            <div 
              className={`absolute inset-0 bg-gradient-to-r from-gray-200 via-white to-gray-200 animate-shimmer rounded-md
                ${imageLoading[index] ? 'visible' : 'invisible'}`}
              style={{
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite linear'
              }}
            />
            <Image
              src={items[index].fileUrl}
              alt={`Product image ${index + 1}`}
              fill
              sizes="50vw"
              className={`object-cover rounded-md transition-opacity duration-300 ${
                imageLoading[index] ? 'opacity-0' : 'opacity-100'
              }`}
              onError={() => handleImageError(index)}
              onLoadingComplete={() => handleLoadingComplete(index)}
              onLoad={() => handleLoadingComplete(index)}
              onLoadStart={() => handleLoadingStart(index)}
              loading={index === 0 ? "eager" : "lazy"}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-md">
            <p>Image not available</p>
          </div>
        )}
      </div>
      <div className="flex flex-start gap-4 mt-8">
        {items.map((item: any, i: number) => (
          <div
            className="w-1/4 h-32 relative gap-4 mt-8 cursor-pointer"
            key={item._id || i}
            onClick={() => setIndex(i)}
          >
            {isValidUrl(item.fileUrl) && !imgError[i] ? (
              <>
                {/* Thumbnail shimmer effect */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-r from-gray-200 via-white to-gray-200 animate-shimmer rounded-md
                    ${imageLoading[i] ? 'visible' : 'invisible'}`}
                  style={{
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite linear'
                  }}
                />
                <Image
                  src={item.fileUrl}
                  alt={`Thumbnail ${i + 1}`}
                  fill
                  sizes="30vw"
                  className={`object-cover rounded-md transition-opacity duration-300 ${
                    imageLoading[i] ? 'opacity-0' : 'opacity-100'
                  }`}
                  onError={() => handleImageError(i)}
                  onLoadingComplete={() => handleLoadingComplete(i)}
                  onLoad={() => handleLoadingComplete(i)}
                  onLoadStart={() => handleLoadingStart(i)}
                  loading="lazy"
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-md">
                <p>Thumbnail not available</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductImages;

// Add this to your global CSS file
const shimmerStyles = `
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.animate-shimmer {
  animation: shimmer 1.5s infinite linear;
  background: linear-gradient(
    90deg,
    rgba(229, 231, 235, 0.1) 25%,
    rgba(229, 231, 235, 0.3) 37%,
    rgba(229, 231, 235, 0.1) 63%
  );
  background-size: 400% 100%;
}
`;