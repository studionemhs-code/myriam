import React from 'react';
import { Icon } from 'lucide-react';

const nodes = [
  ['path', { key: 'left', d: 'M12 4c0-2-2-2-2 0L8.5 11 5 15l4 4 3-5V4Z' }],
  ['path', { key: 'right', d: 'M12 4c0-2 2-2 2 0l1.5 7 3.5 4-4 4-3-5' }],
  ['path', { key: 'wrists', d: 'm2 18 3-3 4 4-3 3M22 18l-3-3-4 4 3 3' }]
];
export default function PrayingHandsIcon(props) { return <Icon iconNode={nodes} {...props} />; }