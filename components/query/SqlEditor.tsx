
import React, { useState, useRef, useEffect } from 'react';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
  'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
  'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'AS', 'ON', 'DISTINCT',
  'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'VALUES'
];

const SCHEMA_SUGGESTIONS = [
  'users', 'sales', 'products', 'inventory', 'orders', 'customers',
  'id', 'name', 'email', 'created_at', 'amount', 'status', 'category'
];

export const SqlEditor: React.FC<SqlEditorProps> = ({ value, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [cursorCoords, setCursorCoords] = useState({ top: 0, left: 0 });
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sync scrolling between textarea and backdrop
  const handleScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    updateSuggestions(val, e.target.selectionStart);
  };

  // Simple Syntax Highlighting
  const getHighlightedText = (text: string) => {
    if (!text) return <br />;

    // Escape HTML
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Keywords
    const keywordRegex = new RegExp(`\\b(${SQL_KEYWORDS.join('|')})\\b`, 'gi');
    html = html.replace(keywordRegex, '<span class="text-blue-600 font-bold">$1</span>');

    // Strings (Single quotes)
    html = html.replace(/'([^']*)'/g, '<span class="text-green-600">\'$1\'</span>');

    // Numbers
    html = html.replace(/\b(\d+)\b/g, '<span class="text-orange-600">$1</span>');

    // Functions
    html = html.replace(/\b(COUNT|SUM|AVG|MIN|MAX)\b/gi, '<span class="text-purple-600 font-bold">$1</span>');

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Auto-completion Logic
  const updateSuggestions = (text: string, cursorPos: number) => {
    const textBeforeCursor = text.substring(0, cursorPos);
    const words = textBeforeCursor.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord.length > 1) {
      const allSuggestions = [...SQL_KEYWORDS, ...SCHEMA_SUGGESTIONS];
      const matches = allSuggestions.filter(s => 
        s.toLowerCase().startsWith(lastWord.toLowerCase()) && s.toLowerCase() !== lastWord.toLowerCase()
      );
      
      if (matches.length > 0) {
        setSuggestions(matches.slice(0, 5));
        setShowSuggestions(true);
        
        // Calculate simplified cursor position for popup
        // (In a real app, use a library like textarea-caret-position)
        // This is a rough approximation for the demo
        const lines = textBeforeCursor.split('\n');
        const currentLineIndex = lines.length - 1;
        const currentLineLength = lines[currentLineIndex].length;
        
        setCursorCoords({
          top: (currentLineIndex + 1) * 20, // approximate line height
          left: (currentLineLength * 8) // approximate char width
        });
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const words = textBeforeCursor.split(/\s+/);
    const lastWord = words[words.length - 1];
    
    const newValue = value.substring(0, cursorPos - lastWord.length) + suggestion + value.substring(cursorPos);
    onChange(newValue);
    setShowSuggestions(false);
    
    // Restore focus
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = cursorPos - lastWord.length + suggestion.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        applySuggestion(suggestions[0]);
      } else {
        // Insert spaces for tab
        const start = textareaRef.current?.selectionStart || 0;
        const end = textareaRef.current?.selectionEnd || 0;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
           textareaRef.current?.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
    } else if (e.key === 'Enter' && showSuggestions) {
        e.preventDefault();
        applySuggestion(suggestions[0]);
    } else if (e.key === 'Escape') {
        setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[300px] font-mono text-sm bg-white rounded-md overflow-hidden">
      {/* Backdrop for Highlighting */}
      <div 
        ref={backdropRef}
        className="absolute inset-0 p-3 whitespace-pre-wrap pointer-events-none z-0 overflow-hidden text-transparent bg-transparent"
        aria-hidden="true"
      >
        {getHighlightedText(value)}
      </div>

      {/* Actual Input */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className="absolute inset-0 w-full h-full p-3 bg-transparent text-slate-800 caret-black resize-none border-none focus:ring-0 outline-none z-10"
        style={{ 
            whiteSpace: 'pre-wrap', 
            color: 'transparent', 
            background: 'transparent',
            caretColor: 'black'
        }}
        spellCheck={false}
      />

      {/* Autocomplete Dropdown */}
      {showSuggestions && (
        <div 
            className="absolute bg-white border border-slate-200 shadow-lg rounded z-20 max-h-40 overflow-y-auto"
            style={{ 
                top: Math.min(cursorCoords.top + 40, 200), // clamp
                left: Math.min(cursorCoords.left + 20, 300) 
            }}
        >
            {suggestions.map((s, i) => (
                <div 
                    key={s}
                    onClick={() => applySuggestion(s)}
                    className={`px-3 py-1 cursor-pointer hover:bg-blue-50 ${i === 0 ? 'bg-blue-50' : ''}`}
                >
                    {s}
                </div>
            ))}
        </div>
      )}
    </div>
  );
};
