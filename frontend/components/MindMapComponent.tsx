// frontend/components/MindMapComponent.tsx (Complete, Updated File)

'use client';
import { useState, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { generateMindMap } from '@/lib/api';
import { LoaderCircle, BrainCircuit } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MindMapComponent({ documentId }: { documentId: string }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onNodesChange: OnNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), [setNodes]);
  const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), [setEdges]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a central topic.");
      return;
    }
    setIsLoading(true);
    setNodes([]);
    setEdges([]);
    const mapToast = toast.loading('Generating your mind map...');

    try {
      const mindMapData = await generateMindMap(documentId, topic);
      const positionedNodes = mindMapData.nodes.map((node: Node) => ({
        ...node,
        position: { x: Math.random() * 600, y: Math.random() * 400 },
      }));
      setNodes(positionedNodes);
      setEdges(mindMapData.edges);
      toast.success('Mind map generated!', { id: mapToast });
    } catch (error) {
      console.error('Failed to generate mind map:', error);
      toast.error('Could not generate mind map.', { id: mapToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-[75vh] border border-slate-700 rounded-xl shadow-2xl bg-slate-800 flex flex-col">
       <div className="p-4 border-b border-slate-700 flex items-center space-x-4">
            <BrainCircuit className="text-indigo-400" />
            <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter central topic (e.g., 'Photosynthesis')"
                className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <button 
                onClick={handleGenerate} 
                disabled={isLoading}
                className="px-6 py-3 flex items-center space-x-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all"
            >
                {isLoading && <LoaderCircle className="animate-spin mr-2" />}
                Generate Map
            </button>
       </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        className="bg-slate-900"
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}