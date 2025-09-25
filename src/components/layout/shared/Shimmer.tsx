import React from 'react';
import { styled, keyframes } from '@mui/material/styles';
import Box from '@mui/material/Box';

// Shimmer animation keyframes
const shimmerAnimation = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

// Styled shimmer component
const ShimmerBox = styled(Box)<{ 
  width: string | number; 
  height: string | number; 
}>(({ width, height }) => ({
  width: typeof width === 'number' ? `${width}px` : width,
  height: typeof height === 'number' ? `${height}px` : height,
  background: `
    linear-gradient(
      90deg,
      transparent 25%,
      rgba(0, 0, 0, 0.1) 37%,
      transparent 63%
    )
  `,
  backgroundColor: 'rgba(0, 0, 0, 0.05)',
  backgroundSize: '200px 100%',
  animation: `${shimmerAnimation} 1.5s ease-in-out infinite`,
  borderRadius: '4px',
}));

interface ShimmerProps {
  /**
   * Width of the shimmer element
   * Can be a number (pixels) or string (any CSS unit)
   * @default '100%'
   */
  width?: string | number;
  
  /**
   * Height of the shimmer element
   * Can be a number (pixels) or string (any CSS unit)
   * @default 20
   */
  height?: string | number;
  
  /**
   * Border radius of the shimmer element
   * @default '4px'
   */
  borderRadius?: string | number;
  
  /**
   * Additional CSS class name
   */
  className?: string;
  
  /**
   * Additional inline styles
   */
  style?: React.CSSProperties;
}

const Shimmer: React.FC<ShimmerProps> = ({
  width = '100%',
  height = 20,
  borderRadius = '4px',
  className,
  style,
}) => {
  return (
    <ShimmerBox
      width={width}
      height={height}
      className={className}
      sx={{
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        ...style,
      }}
    />
  );
};

export default Shimmer;