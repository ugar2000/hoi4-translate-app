'use client'

import React, { FC, useEffect, useRef, useState, useCallback } from "react";
import { getCaretCoordinates } from "@/helpers";

const colorMap = {
    C: 'text-cyan-400',       // (35, 206, 255)
    L: 'text-[#c3b091]',       // (195, 176, 145)
    W: 'text-white',           // (255, 255, 255)
    T: 'text-white',           // (255, 255, 255)
    B: 'text-blue-500',        // (0, 0, 255)
    G: 'text-green-500',       // (0, 159, 3)
    R: 'text-red-500',         // (255, 50, 50)
    b: 'text-black',           // (0, 0, 0)
    g: 'text-gray-400',        // (176, 176, 176)
    Y: 'text-yellow-400',      // (255, 189, 0)
    H: 'text-yellow-400',      // (255, 189, 0)
    O: 'text-orange-500',      // (255, 112, 25)
    '0': 'text-purple-500',    // (203, 0, 203)
    '1': 'text-[#8078d3]',     // (128, 120, 211)
    '2': 'text-[#5170f3]',     // (81, 112, 243)
    '3': 'text-[#518fdc]',     // (81, 143, 220)
    '4': 'text-[#5abe3]',      // (90, 190, 231)
    '5': 'text-[#3fb5c2]',     // (63, 181, 194)
    '6': 'text-[#77ccb6]',     // (119, 204, 186)
    '7': 'text-[#99d199]',     // (153, 209, 153)
    '8': 'text-[#cca333]',     // (204, 163, 51)
    '9': 'text-[#fca97d]',     // (252, 169, 125)
    t: 'text-red-600',         // (255, 76, 77)
};

interface Props {
    value: string;
    onBlur: (value: string) => void;
    className?: string;
    onInput?: (e: any) => void;
}

const RowTextArea: FC<Props> = ({ value, onBlur, onInput, className }) => {
    const [editingValue, setEditingValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const displayRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setEditingValue(value);
    }, [value]);

    const updateDisplay = useCallback(() => {
        if (displayRef.current) {
            displayRef.current.innerHTML = editingValue
                .replace(/§([A-Za-z0-9t])([^§]*)§!/g, (match, tag, text) => {
                    const colorClass = colorMap[tag] || '';
                    return `<span class="${colorClass}">§${tag}${text}§!</span>`;
                })
                .replace(/\[([^\]]+)\]/g, '<span class="text-pink-500">[$1]</span>')
                .replace(/\n/g, '<br/>');
        }
    }, [editingValue]);

    const updateMirror = useCallback(() => {
        if (mirrorRef.current) {
            const safeText = editingValue
                .replace(/§([A-Za-z0-9t])([^§]*)§!/g, (match, tag, text) => `§${tag}${text}§!`)
                .replace(/\[([^\]]+)\]/g, '[$1]')
                .replace(/\n/g, '<br/>');
            mirrorRef.current.innerHTML = safeText + '<span id="caret-marker">|</span>';
        }
    }, [editingValue]);

    const updateCursorPosition = useCallback(() => {
        if (!cursorRef.current) return;

        updateMirror();

        const marker = mirrorRef.current?.querySelector("#caret-marker");
        if (marker) {
            const rect = marker.getBoundingClientRect();
            const containerRect = displayRef.current?.getBoundingClientRect();
            if (rect && containerRect) {
                const top = rect.top - containerRect.top;
                const left = rect.left - containerRect.left;
                cursorRef.current.style.top = `${top + 7}px`;
                cursorRef.current.style.left = `${left + 8}px`;
            }
        } else if (textAreaRef.current) {
            const cursorPosition = textAreaRef.current.selectionStart;
            const cursorCoords = getCaretCoordinates(textAreaRef.current, cursorPosition);
            cursorRef.current.style.top = `${cursorCoords.top}px`;
            cursorRef.current.style.left = `${cursorCoords.left}px`;
        }
    }, [updateMirror]);

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

    const handleKeyUp = () => {
        requestAnimationFrame(() => {
            updateCursorPosition();
        });
    };

    const handleSelect = () => {
        requestAnimationFrame(() => {
            updateCursorPosition();
        });
    };

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditingValue(event.target.value);
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
                className="absolute top-0 left-0 w-full h-full text-sm opacity-0 resize-none overflow-hidden"
            />
            <div
                ref={displayRef}
                className="w-full h-full p-4 font-mono text-sm bg-gray-800 text-white rounded-md focus:outline-none whitespace-pre-wrap"
            />
            <div
                ref={mirrorRef}
                className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-0 whitespace-pre-wrap font-mono text-sm p-4"
            />
            {isFocused && (
                <div
                    ref={cursorRef}
                    className="absolute w-px h-[1em] bg-white animate-blink pointer-events-none"
                />
            )}
            <style jsx>{`
                @keyframes blink {
                    0% { opacity: 1; }
                    50% { opacity: 0; }
                    100% { opacity: 1; }
                }
                .animate-blink {
                    animation: blink 1s step-start infinite;
                }
            `}</style>
        </div>
    );
};

export default RowTextArea;
