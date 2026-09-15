import React from 'react';
import { Icon } from 'lucide-react';

const nodes = Array.from({ length: 8 }, (_, i) => ['rect', { key: `link-${i}`, x: '9.8', y: '1.5', width: '4.4', height: '6.5', rx: '2.2', transform: `rotate(${i * 45} 12 12)` }]);
export default function ChainCircleIcon(props) { return <Icon iconNode={nodes} {...props} />; }