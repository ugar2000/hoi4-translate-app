'use client';

import {useContext} from 'react';
import { FileContext } from '@/components/FileContext';
import React from 'react';
import RowTextArea from "@/components/UploadedFileRedactor/RowTextArea";

const UploadedFileRedactor: React.FC = () => {
    const { rows, updateRow } = useContext(FileContext);

    const handleTextChange = (index: number, newText: string) => {
        updateRow({ ...rows[index], text: newText });
    };

    const handleTranslatedTextChange = (index: number, newTranslatedText: string) => {
        if(!rows[index]) return;
        updateRow({ ...rows[index], translatedText: newTranslatedText });
    };

    const handleTranslateClick = (code: string, originalText: string) => {
        console.log(`Переводим строку с кодом ${code}: ${originalText}`);
    };

    return (
        <div className="w-[100%] border border-sky-500 text-amber-950 p-4">
            <h1 className="text-2xl font-bold mb-4">UploadedFileRedactor</h1>
            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2"> {/* Изменено соотношение столбцов */}
                {rows.map((item, index) => (
                    <React.Fragment key={index}>
                        <div className="font-mono text-sm text-left pr-2 whitespace-nowrap">
                            {item.code || ''} {/* Добавлено whitespace-nowrap для предотвращения переноса */}
                        </div>
                        <RowTextArea
                            value={item.text}
                            onBlur={(value) => handleTextChange(index, value)}
                            onInput={(e) => {e.target.style.height = "auto"; e.target.style.height = (e.target.scrollHeight)+"px";}}
                            className={`resize-none p-1 border border-gray-300 rounded`}
                        />
                        <RowTextArea
                            value={item?.translatedText || ''}
                            onBlur={(value) => handleTranslatedTextChange(index, value)}
                            onInput={(e) => {e.target.style.height = "auto"; e.target.style.height = (e.target.scrollHeight)+"px";}}
                            className={`resize-none p-1 border border-gray-300 rounded`}
                        />
                        <button
                            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-700"
                            onClick={() => handleTranslateClick(item.code || '', item.text)}
                        >
                            AI
                        </button>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default UploadedFileRedactor;
