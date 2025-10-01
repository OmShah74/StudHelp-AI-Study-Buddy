// frontend/components/CustomNode.tsx (New File)
'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

// Define a mapping from category names to Tailwind CSS classes
const categoryColorMap: { [key: string]: string } = {
  'Core Concept': 'bg-sky-800 border-sky-500',
  'Process': 'bg-teal-800 border-teal-500',
  'Example': 'bg-amber-800 border-amber-500',
  'Property': 'bg-purple-800 border-purple-500',
  'Person': 'bg-rose-800 border-rose-500',
  'Location': 'bg-green-800 border-green-500',
  'default': 'bg-slate-800 border-slate-500',
};

// We use memo for performance optimization, as nodes can re-render frequently.
const CustomNode = memo(({ data }: NodeProps) => {
  const colorClasses = categoryColorMap[data.category] || categoryColorMap['default'];

  return (
    <div className={`w-64 rounded-lg shadow-xl border-2 ${colorClasses} text-white`}>
      {/* Handles are the connection points for edges */}
      <Handle type="target" position={Position.Left} className="!bg-cyan-400" />
      
      <div className="p-4">
        <div className="font-bold text-lg mb-2">{data.label}</div>
        <div className="text-sm text-slate-300">{data.description}</div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-cyan-400" />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

export default CustomNode;