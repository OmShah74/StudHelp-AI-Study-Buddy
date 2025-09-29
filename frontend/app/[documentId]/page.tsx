'use client';

import { useState } from "react";
import { useParams } from 'next/navigation';
// Import all necessary icons, including the new one for recommendations
import { MessageSquare, Book, BrainCircuit, FileQuestion, Lightbulb } from 'lucide-react';

// Import all of the feature components that this page will manage
import ChatComponent from "@/components/ChatComponent";
import MindMapComponent from "@/components/MindMapComponent";
import SummaryComponent from "@/components/SummaryComponent";
import QuizComponent from "@/components/QuizComponent";
import RecommendationsComponent from "@/components/RecommendationsComponent";

// Define a TypeScript type for all possible tabs to ensure type safety
type Tab = 'chat' | 'summary' | 'mindmap' | 'quiz' | 'recommendations';

export default function DocumentWorkspace() {
  const params = useParams();
  // Safely cast the documentId from the URL parameters as a string
  const documentId = params.documentId as string;
  // State to keep track of the currently active tab, defaulting to 'chat'
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  // This function conditionally renders the correct component based on the active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatComponent documentId={documentId} />;
      case 'summary':
        return <SummaryComponent documentId={documentId} />;
      case 'mindmap':
        return <MindMapComponent documentId={documentId} />;
      case 'quiz':
        return <QuizComponent documentId={documentId} />;
      case 'recommendations':
        return <RecommendationsComponent documentId={documentId} />;
      default:
        // Return null or a fallback UI if no tab is selected
        return null;
    }
  };
  
  // A reusable button component for the tab navigation
  const TabButton = ({ tabName, icon, label }: { tabName: Tab, icon: React.ReactNode, label: string }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`relative flex items-center space-x-2 px-4 py-3 text-sm font-semibold rounded-t-lg outline-none transition-all duration-300 ${
        activeTab === tabName
          ? 'text-white' // Style for the active tab
          : 'text-slate-400 hover:text-white' // Style for inactive tabs
      }`}
    >
      {icon}
      <span>{label}</span>
      {/* This span creates the colored underline effect for the active tab */}
      {activeTab === tabName && (
        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-full"></span>
      )}
    </button>
  );

  return (
    <main className="container mx-auto p-4">
      {/* The tab navigation bar */}
      <div className="flex flex-wrap items-center space-x-2 border-b-2 border-slate-700">
          <TabButton tabName="chat" icon={<MessageSquare size={18} />} label="Chat" />
          <TabButton tabName="summary" icon={<Book size={18} />} label="Summary" />
          <TabButton tabName="mindmap" icon={<BrainCircuit size={18} />} label="Mind Map" />
          <TabButton tabName="quiz" icon={<FileQuestion size={18} />} label="Quiz Me" />
          <TabButton tabName="recommendations" icon={<Lightbulb size={18} />} label="Recommendations" />
      </div>

      {/* The main content area where the active component will be rendered */}
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </main>
  );
}