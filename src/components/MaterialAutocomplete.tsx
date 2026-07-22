import { useMemo, useState, useEffect } from "react";
import {
  MaterialType,
  getMaterialSuggestions
} from "../utils/materialRegistry";

interface Props {
  type: MaterialType;
  value: string;
  onChange: (value: string) => void;
}

export default function MaterialAutocomplete({
  type,
  value,
  onChange
}: Props) {

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const suggestions = useMemo(() => {
    return getMaterialSuggestions(type, value);
  }, [type, value]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [value, suggestions.length]);

  const selectSuggestion = (item: string) => {
    onChange(item);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {

    if (!suggestions.length) return;

    switch (e.key) {

      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(i =>
          Math.min(i + 1, suggestions.length - 1)
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(i =>
          Math.max(i - 1, 0)
        );
        break;

      case "Enter":
      case "Tab":
        e.preventDefault();
        selectSuggestion(suggestions[selectedIndex]);
        break;

      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  return (

    <div className="relative w-full">

      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => {
          setTimeout(() => setShowSuggestions(false), 150);
        }}
        autoComplete="off"
        spellCheck={false}
        className="w-full bg-[#0a0a0b] text-white text-sm px-3 py-2.5 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400 transition"
      />

      {showSuggestions &&
        value.trim().length > 0 &&
        suggestions.length > 0 && (

        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-[#27272a] bg-[#18181b] shadow-2xl">

          {suggestions.slice(0, 8).map((item, index) => (

            <button
              key={item}
              type="button"
              onMouseDown={() => selectSuggestion(item)}
              className={`block w-full px-3 py-2 text-left text-sm transition ${
                index === selectedIndex
                  ? "bg-teal-500/20 text-teal-300"
                  : "text-white hover:bg-teal-500/10 hover:text-teal-300"
              }`}
            >
              {item}
            </button>

          ))}

        </div>

      )}

    </div>

  );
}