// frontend/components/MindMapComponent.tsx (Complete, Final Corrected Code)
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
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng } from 'html-to-image';
import { generateMindMap } from '@/lib/api';
import toast from 'react-hot-toast';
import { LoaderCircle, BrainCircuit, Download } from 'lucide-react';
import CustomNode from './CustomNode'; // Your custom node component
import { getLayoutedElements } from '@/lib/layout'; // <-- Import our new layout function

// Define the custom node type for React Flow
const nodeTypes = { custom: CustomNode };

// Helper function to trigger the image download
function downloadImage(dataUrl: string) {
  const a = document.createElement('a');
  a.setAttribute('download', 'ai-study-buddy-mind-map.png');
  a.setAttribute('href', dataUrl);
  a.click();
}

const MindMapContent = ({ documentId }: { documentId: string }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  
  const onNodesChange: OnNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a central topic to generate the map.");
      return;
    }

    setIsLoading(true);
    setNodes([]);
    setEdges([]);
    const mapToast = toast.loading('Generating your advanced mind map...');

    try {
      const mindMapData = await generateMindMap(documentId, topic);
      
      if (!mindMapData || !mindMapData.nodes || !mindMapData.edges) {
        throw new Error("Invalid data format received from server.");
      }

      // --- THIS IS THE KEY FIX ---
      // Pass the generated nodes and edges to our layout function
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        mindMapData.nodes.map(node => ({ ...node, type: 'custom' })),
        mindMapData.edges
      );
      // --------------------------
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      toast.success('Mind map generated successfully!', { id: mapToast });

    } catch (error) {
      console.error('Failed to generate mind map:', error);
      toast.error('Could not generate the mind map. Please try again.', { id: mapToast });
    } finally {
      setIsLoading(false);
    }
  };

  const onDownload = useCallback(() => {
    const flowPane = document.querySelector('.react-flow__viewport');
    if (!rfInstance || !flowPane || nodes.length === 0) {
      toast.error("Mind map not ready or is empty.");
      return;
    }

    toast.loading('Preparing image for download...');
    
    toPng(flowPane as HTMLElement, {
      width: 1920,
      height: 1080,
    }).then(downloadImage).catch((err) => {
        console.error("Failed to capture image:", err);
        toast.error("Failed to generate image for download.");
    });
  }, [rfInstance, nodes]);

  return (
    <div className="w-full h-[75vh] border border-slate-700 rounded-xl shadow-2xl bg-slate-800 flex flex-col">
       <div className="p-4 border-b border-slate-700 flex items-center space-x-4">
            <BrainCircuit className="text-indigo-400" />
            <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter central topic for the mind map..."
                className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isLoading}
            />
            <button 
              onClick={handleGenerate} 
              disabled={isLoading} 
              className="px-6 py-3 flex items-center space-x-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
                {isLoading && <LoaderCircle className="animate-spin mr-2" />}
                Generate Map
            </button>
            <button 
              onClick={onDownload} 
              className="p-3 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700" 
              title="Download as PNG"
            >
                <Download />
            </button>
       </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onInit={setRfInstance}
        fitView
        className="bg-slate-900"
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

// The main component that wraps everything in the provider.
// This requires: npm install dagre @types/dagre
export default function MindMapComponentWrapper({ documentId }: { documentId: string }) {
  return (
    <ReactFlowProvider>
      <MindMapContent documentId={documentId} />
    </ReactFlowProvider>
  );
}