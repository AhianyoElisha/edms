import { emphasize, styled } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import { useEffect, useState } from 'react';

const StyledBreadcrumb = styled(Chip)(({ disabled }: {disabled: boolean}) => {
  const [systemMode, setSystemMode] = useState('light'); // Default to 'light' or whatever default you prefer

  useEffect(() => {
    // This will only run on the client side
    const storedMode = localStorage.getItem('flow-mineral-water-mui-template-mode');
    if (storedMode) {
      setSystemMode(storedMode);
    }
  }, [localStorage.getItem('flow-mineral-water-mui-template-mode')]);

  const backgroundColor =
    systemMode === 'light'
      ? 'rgba(216, 210, 210, 0.54)'
      : 'rgba(255, 255, 255, 0.37)';
  return {
    backgroundColor,
    padding: '14px',
    height: '30px',
    color: systemMode === 'light' ? '#000' : '#fff',
    '&:hover, &:focus': {
      backgroundColor: emphasize(backgroundColor, 0.06),
    },
    '&:active': {
      boxShadow: 'inset 0 0 0 2px rgba(0,0,0,.6)',
      backgroundColor: emphasize(backgroundColor, 0.12),
      },
    ':disabled': {
      boxShadow: 'inset 0 0 0 2px rgba(0,0,0,.6)',
      backgroundColor: emphasize(backgroundColor, 0.12),
    },
    '& .MuiChip-icon': {
      fontSize: '0.5rem', // This makes the icon smaller
    },
  };
}) as typeof Chip; 

export default StyledBreadcrumb;
