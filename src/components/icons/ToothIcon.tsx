import { createLucideIcon } from 'lucide-react';

export const ToothIcon = createLucideIcon('Tooth', [
  [
    'path',
    {
      d: 'M4.5 4.5c1.333-1.333 3.5-1.5 5.5-1 1.5.375 2 1.5 2 1.5s.5-1.125 2-1.5c2-.5 4.167-.333 5.5 1 1.5 1.5 2 4 1 7-.667 2-1.5 4-2 7-.5 2-1.5 3-3 3-1.333 0-2-1.5-3-2-1 .5-1.667 2-3 2-1.5 0-2.5-1-3-3-.5-3-1.333-5-2-7-1-3-.5-5.5 1-7z',
      key: 'tooth-body',
    },
  ],
  [
    'path',
    {
      d: 'M10 8.5a3.5 3.5 0 0 1 4 0',
      key: 'tooth-detail',
    },
  ],
]);

export default ToothIcon;
