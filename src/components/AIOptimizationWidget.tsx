import React, { useState, useEffect } from 'react';
import { Bot, Zap, Send, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Formulation } from '../types';

interface AIOptimizationWidgetProps {
  currentFormulation: Formulation | null;
  projectId: string;
}

export const AIOptimizationWidget: React.FC<AIOptimizationWidgetProps> = ({ currentFormulation, projectId }) => {
  const [optimization, setOptimization] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{sender: 'user' | 'ai', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (currentFormulation) {
      handleOptimize();
    }
  }, [currentFormulation]);

  const handleOptimize = async () => {
    setLoading(true);
    try {
      // Fetch historical runs
      const expRef = collection(db, "projects", projectId, "experiments");
      const snapshot = await getDocs(expRef);
      const historicalRuns = snapshot.docs.map(doc => doc.data());

      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentFormulation, historicalRuns })
      });
      const data = await response.json();
      setOptimization(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!input.trim()) return;
    setChatLoading(true);
    const userMsg = input;
    setMessages(prev => [...prev, {sender: 'user', text: userMsg}]);
    setInput('');

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMsg })
        });
        const data = await response.json();
        setMessages(prev => [...prev, {sender: 'ai', text: data.response}]);
    } catch (e) {
        console.error(e);
    } finally {
        setChatLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Zap size={20}/> AI Optimization</h2>
      
      {loading ? <Loader2 className="animate-spin" /> : optimization ? (
        <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Voltaggio:</strong> {optimization.voltageKv} kV</p>
            <p><strong>Portata:</strong> {optimization.flowRateMlH} mL/h</p>
            <p className="bg-white p-2 rounded">{optimization.reasoning}</p>
        </div>
      ) : <p>Seleziona una formulazione.</p>}

      <hr className="my-4"/>
      
      <h3 className="font-medium mb-2 flex items-center gap-2"><Bot size={18}/> Chatbot AI</h3>
      <div className="h-40 overflow-y-auto bg-white p-2 rounded border mb-2">
        {messages.map((m, i) => (
            <div key={i} className={`p-1 ${m.sender === 'user' ? 'text-right text-blue-600' : 'text-left'}`}>
                {m.text}
            </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} className="flex-1 border p-1 rounded" placeholder="Chiedi all'AI..."/>
        <button onClick={handleChat} disabled={chatLoading} className="bg-blue-600 text-white p-2 rounded"><Send size={16}/></button>
      </div>
    </div>
  );
};
