// frontend/lib/layout.ts (New File)
'use client';

import dagre from 'dagre';
import { Node, Edge } from 'reactflow';

// Define constants for node dimensions, which Dagre needs to calculate spacing
const nodeWidth = 256; // Same as the w-64 class in CustomNode.tsx
const nodeHeight = 100; // An approximate height for our custom nodes

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// This function takes nodes and edges and returns them with calculated positions
export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  // Set the layout direction (TB = Top to Bottom)
  dagreGraph.setGraph({ rankdir: direction });

  // Add each node to the Dagre graph with its dimensions
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // Add each edge to the Dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  dagre.layout(dagreGraph);

  // Update the position of each node with the values calculated by Dagre
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    // We position the node from its center, so we offset by half its width/height
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};