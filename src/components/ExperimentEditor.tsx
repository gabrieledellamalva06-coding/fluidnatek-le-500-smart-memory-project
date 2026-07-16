import React, { useState } from "react";
import { Experiment } from "../types";
import { Save, X } from "lucide-react";
import { TRANSLATIONS, Language } from "../lib/translations";

interface Props {
  experiment: Experiment;
  onSave: (exp: Experiment) => void;
  onClose: () => void;
  lang: Language;
}

export default function ExperimentEditor({ experiment, onSave, onClose, lang }: Props) {
  const [editedExp, setEditedExp] = useState<Experiment>({ ...experiment });
  const t = TRANSLATIONS[lang];

  const handleSave = () => {
    onSave(editedExp);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-8 z-50">
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-[#27272a] flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{t.inspectionData} {editedExp.operationIdentifier}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X /></button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Metadati Estratti */}
            <div className="bg-[#0a0a0b] p-4 rounded-xl border border-[#27272a]">
              <h3 className="text-xs font-bold text-teal-400 uppercase mb-3">{t.extractedMetadata}</h3>
              <div className="space-y-2 text-xs text-zinc-300">
                {Object.entries(experiment.metadata || {}).map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b border-zinc-800 pb-1">
                    <span className="text-zinc-500">{key}:</span>
                    <span>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Commenti */}
            <div className="bg-[#0a0a0b] p-4 rounded-xl border border-[#27272a]">
              <h3 className="text-xs font-bold text-teal-400 uppercase mb-3">{t.operatorNotes}</h3>
              <p className="text-xs text-zinc-300 whitespace-pre-wrap">{experiment.operatorComments}</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[#27272a] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-zinc-800 text-white">{t.close}</button>
        </div>
      </div>
    </div>
  );
}
