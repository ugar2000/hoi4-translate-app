'use client'

import React, { FC, useEffect, useRef, useState, useCallback } from "react";
import { getCaretCoordinates } from "@/helpers";

const colorMap = {
    C: 'text-cyan-400',
    L: 'text-[#c3b091]',
    W: 'text-white',
    T: 'text-white',
    B: 'text-blue-500',
    G: 'text-green-500',
    R: 'text-red-500',
    b: 'text-black',
    g: 'text-gray-400',
    Y: 'text-yellow-400',
    H: 'text-yellow-400',
    O: 'text-orange-500',
    '0': 'text-purple-500',
    '1': 'text-[#8078d3]',
    '2': 'text-[#5170f3]',
    '3': 'text-[#518fdc]',
    '4': 'text-[#5abe3]',
    '5': 'text-[#3fb5c2]',
    '6': 'text-[#77ccb6]',
    '7': 'text-[#99d199]',
    '8': 'text-[#cca333]',
    '9': 'text-[#fca97d]',
    t: 'text-red-600',
};

type ColorMapKey = keyof typeof colorMap;

interface Props {
    value: string;
    onBlur: (value: string) => void;
    className?: string;
    onInput?: (e: any) => void;
}

const RowTextArea: FC<Props> = ({ value, onBlur, onInput, className }) => {
    const [editingValue, setEditingValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const [cursorPosition, setCursorPosition] = useState<number | null>(null);
    const [lineHeight, setLineHeight] = useState(20);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const displayRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setEditingValue(value);
    }, [value]);

    useEffect(() => {
        if (displayRef.current) {
            const computedStyle = window.getComputedStyle(displayRef.current);
            const computed = parseInt(computedStyle.lineHeight);
            if (!isNaN(computed)) {
                setLineHeight(computed);
            }
        }
    }, []);

    const updateDisplay = useCallback(() => {
        if (displayRef.current) {
            displayRef.current.innerHTML = editingValue
                .replace(/§([A-Za-z0-9t])([^§]*)§!/g, (match, tag, text) => {
                    const colorClass = colorMap[tag as ColorMapKey] || '';
                    return `<span class="${colorClass}">§${tag}${text}§!</span>`;
                })
                .replace(/\[([^\]]+)\]/g, '<span class="text-pink-500">[$1]</span>')
                .replace(/\n/g, '<br/>');
        }
    }, [editingValue]);

    const updateCursorPosition = useCallback(() => {
        if (!cursorRef.current || !textAreaRef.current || !displayRef.current) return;

        const position = textAreaRef.current.selectionStart;
        setCursorPosition(position);

        const textBeforeCursor = editingValue.substring(0, position);
        
        const lines = textBeforeCursor.split('\n');
        const currentLineNumber = lines.length - 1;
        const currentLine = lines[currentLineNumber];
        
        const measureSpan = document.createElement('span');
        measureSpan.style.font = window.getComputedStyle(displayRef.current).font;
        measureSpan.style.whiteSpace = 'pre';
        measureSpan.textContent = currentLine;
        displayRef.current.appendChild(measureSpan);
        
        const textWidth = measureSpan.getBoundingClientRect().width;
        displayRef.current.removeChild(measureSpan);

        const padding = 16;
        const top = currentLineNumber * lineHeight + padding + 5;
        const left = textWidth + padding + 3;

        cursorRef.current.style.top = `${top}px`;
        cursorRef.current.style.left = `${left}px`;
    }, [editingValue, lineHeight]);

    useEffect(() => {
        updateDisplay();
        if (textAreaRef.current && onInput) {
            onInput({ target: textAreaRef.current });
        }
    }, [editingValue, updateDisplay, onInput]);

    const handleFocus = () => {
        setIsFocused(true);
        requestAnimationFrame(() => {
            updateCursorPosition();
        });
    };

    const handleBlur = () => {
        setIsFocused(false);
        onBlur(editingValue);
    };

    const handleClick = (event: React.MouseEvent<HTMLTextAreaElement>) => {
        requestAnimationFrame(() => {
            updateCursorPosition();
        });
    };

    useEffect(() => {
        const ta = textAreaRef.current;
        if (!ta) return;
        const handleScroll = () => {
            requestAnimationFrame(() => {
                updateCursorPosition();
            });
        };
        ta.addEventListener("scroll", handleScroll);
        return () => {
            ta.removeEventListener("scroll", handleScroll);
        };
    }, [updateCursorPosition]);

    useEffect(() => {
        const handleSelectionChange = () => {
            if (isFocused && document.activeElement === textAreaRef.current) {
                requestAnimationFrame(() => {
                    updateCursorPosition();
                });
            }
        };
        document.addEventListener("selectionchange", handleSelectionChange);
        return () => {
            document.removeEventListener("selectionchange", handleSelectionChange);
        };
    }, [isFocused, updateCursorPosition]);

    const handleKeyUp = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        requestAnimationFrame(() => {
            updateCursorPosition();
        });
    };

    const handleSelect = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
        requestAnimationFrame(() => {
            updateCursorPosition();
        });
    };

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditingValue(event.target.value);
        setCursorPosition(event.target.selectionStart);
    };

    return (
        <div className={`relative min-h-[64px] ${className ? className : ''}`}>
            <textarea
                ref={textAreaRef}
                value={editingValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onSelect={handleSelect}
                onKeyUp={handleKeyUp}
                onClick={handleClick}
                className="absolute top-0 left-0 w-full h-full text-sm opacity-0 resize-none overflow-hidden z-10 p-4 font-mono whitespace-pre-wrap"
            />
            <div
                ref={displayRef}
                className="w-full h-full p-4 font-mono text-sm bg-gray-800 text-white rounded-md focus:outline-none whitespace-pre-wrap leading-[20px]"
            />
            {isFocused && (
                <div
                    ref={cursorRef}
                    className="absolute w-[2px] h-[20px] bg-white animate-blink pointer-events-none"
                />
            )}
        </div>
    );
};

export default RowTextArea;
