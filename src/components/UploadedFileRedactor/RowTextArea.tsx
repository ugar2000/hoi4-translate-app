'use client'

import React, { FC, useEffect, useRef, useState } from "react";
import {getCaretCoordinates} from "@/helpers";

const colorMap = {
    C: 'text-cyan-400',       // (35, 206, 255)
    L: 'text-[#c3b091]',     // (195, 176, 145)
    W: 'text-white',         // (255, 255, 255)
    T: 'text-white',         // (255, 255, 255)
    B: 'text-blue-500',      // (0, 0, 255)
    G: 'text-green-500',     // (0, 159, 3)
    R: 'text-red-500',       // (255, 50, 50)
    b: 'text-black',         // (0, 0, 0)
    g: 'text-gray-400',      // (176, 176, 176)
    Y: 'text-yellow-400',    // (255, 189, 0)
    H: 'text-yellow-400',    // (255, 189, 0)
    O: 'text-orange-500',    // (255, 112, 25)
    '0': 'text-purple-500',  // (203, 0, 203)
    '1': 'text-[#8078d3]',   // (128, 120, 211)
    '2': 'text-[#5170f3]',   // (81, 112, 243)
    '3': 'text-[#518fdc]',   // (81, 143, 220)
    '4': 'text-[#5abe3]',    // (90, 190, 231)
    '5': 'text-[#3fb5c2]',   // (63, 181, 194)
    '6': 'text-[#77ccb6]',   // (119, 204, 186)
    '7': 'text-[#99d199]',   // (153, 209, 153)
    '8': 'text-[#cca333]',   // (204, 163, 51)
    '9': 'text-[#fca97d]',   // (252, 169, 125)
    t: 'text-red-600',       // (255, 76, 77)
};

interface Props {
    value: string;
    onBlur: (value: string) => void;
    className?: string;
    onInput?: (e: any) => void;
}

const RowTextArea: FC<Props> = ({ value, onBlur, onInput, className, ...props }) => {
    const [editingValue, setEditingValue] = useState(value);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const displayRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLTextAreaElement>(null);


    useEffect(() => {
        if (displayRef.current && textAreaRef.current && cursorRef.current) {
            displayRef.current.innerHTML = editingValue
                .replace(/§([A-Za-z0-9t])([^§]*)§!/g, (match, tag, text) => {
                    const colorClass = colorMap[tag] || '';
                    return `<span class="${colorClass}">§${tag}${text}§!</span>`;
                })
                .replace(/\[([^\]]+)\]/g, '<span class="text-pink-500">[$1]</span>')
                .replace(/\n/g, '<span class="text-orange-500">\\n</span>');

            const cursorPosition = textAreaRef.current.selectionStart;
            const cursorCoords = getCaretCoordinates(textAreaRef.current, cursorPosition);

            console.log('cursorCoords', cursorCoords)

            cursorRef.current.style.top = `${cursorCoords.top}px`;
            cursorRef.current.style.left = `${cursorCoords.left}px`;
        }
    }, [editingValue]);

    const handleBlur = () => {
        onBlur(editingValue);
    };

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditingValue(event.target.value);
    };

    return (
        <div className={`relative ${!!className ? className : ''}`} >
      <textarea
          ref={textAreaRef}
          value={editingValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className="absolute top-0 left-0 w-full h-full opacity-0 resize-none"
      />
            <div
                ref={displayRef}
                className="w-full p-4 font-mono text-sm bg-gray-800 text-white rounded-md focus:outline-none"
            />
            <textarea
                ref={cursorRef}
                className="absolute top-0 left-0 resize-none pointer-events-none opacity-0"
                style={{ width: '1px', height: '1em' }} // Размер курсора
            />
        </div>
    );
};

export default RowTextArea;
