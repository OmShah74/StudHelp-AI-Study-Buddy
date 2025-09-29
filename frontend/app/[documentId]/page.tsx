// frontend/app/[documentId]/page.tsx (Complete, Updated File)

'use client';

import { useState } from "react";
import { useParams } from 'next/navigation';
import { MessageSquare, Book, BrainCircuit, FileQuestion } from 'lucide-react';
import ChatComponent from "@/components/ChatComponent";
import MindMapComponent from "@/components/MindMapComponent";
import SummaryComponent from "@/components/SummaryComponent";
import QuizComponent from "@/components/QuizComponent";

type Tab = 'chat' | 'summary' | 'mindmap' | 'quiz';

export default function DocumentWorkspace() {
  const params = useParams();
  const documentId = params.documentId as string;
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat': return <ChatComponent documentId={documentId} />;
      case 'summary': return <SummaryComponent documentId={documentId} />;
      case 'mindmap': return <MindMapComponent documentId={documentId} />;
      case 'quiz': return <QuizComponent documentId={documentId} />;
      default: return null;
    }
  };
  
  const TabButton = ({ tabName, icon, label }: { tabName: Tab, icon: React.ReactNode, label: string }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`relative flex items-center space-x-2 px-4 py-3 text-sm font-semibold rounded-t-lg outline-none transition-all duration-300 ${
        activeTab === tabName
          ? 'text-white'
          : 'text-slate-400 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
      {activeTab === tabName && (
        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-full"></span>
      )}
    </button>
  );

  return (
    <main className="container mx-auto p-4">
      <div className="flex items-center space-x-2 border-b-2 border-slate-700">
          <TabButton tabName="chat" icon={<MessageSquare size={18} />} label="Chat" />
          <TabButton tabName="summary" icon={<Book size={18} />} label="Summary" />
          <TabButton tabName="mindmap" icon={<BrainCircuit size={18} />} label="Mind Map" />
          <TabButton tabName="quiz" icon={<FileQuestion size={18} />} label="Quiz Me" />
      </div>

      <div className="mt-6">
        {renderTabContent()}
      </div>
    </main>
  );
}