
import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, List, Link as LinkIcon, Type, AlignLeft, AlignCenter, AlignRight, Undo, Redo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
}

export function RichTextEditor({ value, onChange, className, placeholder }: RichTextEditorProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Initialize and sync content
    useEffect(() => {
        if (contentRef.current) {
            // Ensure consistent paragraph separator
            document.execCommand('defaultParagraphSeparator', false, 'p');

            // Only update if content is different to avoid cursor jumping
            if (contentRef.current.innerHTML !== value) {
                contentRef.current.innerHTML = value;
            }
        }
    }, [value]);

    const handleInput = () => {
        if (contentRef.current) {
            const html = contentRef.current.innerHTML;
            if (html !== value) {
                onChange(html);
            }
        }
    };

    const execCommand = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (contentRef.current) {
            contentRef.current.focus();
        }
        handleInput();
    };

    const addLink = () => {
        const url = prompt('URL eingeben:');
        if (url) {
            execCommand('createLink', url);
        }
    };

    return (
        <div className={cn("relative border border-gray-200 rounded-md overflow-hidden bg-white flex flex-col", className, isFocused && "ring-2 ring-blue-500 border-transparent")}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-gray-50 flex-wrap">
                <ToolbarButton onClick={() => execCommand('bold')} icon={<Bold className="w-4 h-4" />} title="Fett (Ctrl+B)" />
                <ToolbarButton onClick={() => execCommand('italic')} icon={<Italic className="w-4 h-4" />} title="Kursiv (Ctrl+I)" />
                <div className="w-px h-4 bg-gray-300 mx-1" />
                <ToolbarButton onClick={() => execCommand('insertUnorderedList')} icon={<List className="w-4 h-4" />} title="Liste" />
                <ToolbarButton onClick={addLink} icon={<LinkIcon className="w-4 h-4" />} title="Link einfügen" />
                <div className="w-px h-4 bg-gray-300 mx-1" />
                <ToolbarButton onClick={() => execCommand('justifyLeft')} icon={<AlignLeft className="w-4 h-4" />} title="Links" />
                <ToolbarButton onClick={() => execCommand('justifyCenter')} icon={<AlignCenter className="w-4 h-4" />} title="Zentriert" />
                <ToolbarButton onClick={() => execCommand('justifyRight')} icon={<AlignRight className="w-4 h-4" />} title="Rechts" />
            </div>

            {/* Editor Area */}
            <div
                ref={contentRef}
                className="flex-1 p-4 min-h-[300px] outline-none prose max-w-none text-sm font-sans"
                contentEditable
                onInput={handleInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                suppressContentEditableWarning={true}
            />
            {/* Placeholder overlay */}
            {(!value || value === '<p><br></p>') && !isFocused && (
                <div className="absolute top-[50px] left-4 text-gray-400 pointer-events-none text-sm">
                    {placeholder || 'Nachricht hier schreiben...'}
                </div>
            )}
        </div>
    );
}

function ToolbarButton({ onClick, icon, title }: { onClick: () => void, icon: React.ReactNode, title: string }) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                onClick();
            }}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
            title={title}
        >
            {icon}
        </button>
    );
}
