'use client';

import {useContext, useEffect} from 'react';
import { FileContext } from '@/components/FileContext';
import React from 'react';
import RowTextArea from "@/components/UploadedFileRedactor/RowTextArea";
import { Button } from '@/components/ui/button';
import { en } from '@/locales/en';

const UploadedFileRedactor: React.FC = () => {
    const { rows, updateRow, file, targetLang } = useContext(FileContext);

    useEffect(() => {
        console.log('Rows updated:', rows);
    }, [rows]);

    const handleTextChange = (index: number, newText: string) => {
        updateRow({ ...rows[index], text: newText });
    };

    const handleTranslatedTextChange = (index: number, newTranslatedText: string) => {
        if(!rows[index]) return;
        updateRow({ ...rows[index], translatedText: newTranslatedText });
    };

    const handleTranslateClick = async (code: string, originalText: string) => {
        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: originalText,
                    targetLanguage: targetLang
                })
            });

            if (!response.ok) {
                throw new Error('Translation failed');
            }

            const data = await response.json();
            const index = rows.findIndex(row => row.code === code);
            if (index !== -1) {
                handleTranslatedTextChange(index, data.translatedText);
            }
        } catch (error) {
            console.error('Translation error:', error);
        }
    };

    if (!file || rows.length === 0) {
        return null;
    }


    return (
        <div className="w-[100%] border border-sky-500 text-amber-950 p-4">
            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2">
                {rows.map((item, index) => (
                    <React.Fragment key={index}>
                        <div className="font-mono text-sm text-left pr-2 whitespace-nowrap">
                            {item.code || ''}
                        </div>
                        <RowTextArea
                            value={item.text}
                            onBlur={(value) => handleTextChange(index, value)}
                            onInput={(e) => {e.target.style.height = "auto"; e.target.style.height = (e.target.scrollHeight)+"px";}}
                            className={`resize-none p-1 border border-gray-300 rounded`}
                        />
                        {/* {item.translatedText ? item.translatedText : '...'} */}
                        <RowTextArea
                            value={item.translatedText || ''}
                            onBlur={(value) => handleTranslatedTextChange(index, value)}
                            onInput={(e) => {e.target.style.height = "auto"; e.target.style.height = (e.target.scrollHeight)+"px";}}
                            className={`resize-none p-1 border border-gray-300 rounded`}
                        />
                        <Button
                            onClick={() => handleTranslateClick(item.code, item.text)}
                            variant="default"
                            size="sm"
                        >
                            {en.actions.translate}
                        </Button>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default UploadedFileRedactor;
