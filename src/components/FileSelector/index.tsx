'use client'

import React, {ChangeEvent, useCallback, useContext, useEffect, useState} from "react";
import {FileContext} from "@/components/FileContext";
import {LANGUAGE_CODES, LineItem} from "@/types";

const FileSelector = () => {
    const {setFile, file, setOriginLang, addRow, setRows} = useContext(FileContext)

    useEffect(() => {
        if (file) {
            const reader = new FileReader();

            reader.onload = (event) => {
                const yamlContent = event.target?.result;

                if (yamlContent) {
                    const lines = (yamlContent as String).split('\n');
                    const firstLine = lines[0];

                    const [originLang] = firstLine.split(':');
                    const isValidLanguage = Object.values(LANGUAGE_CODES).includes(originLang);

                    if (isValidLanguage) {
                        setOriginLang(originLang as LANGUAGE_CODES);
                        const rows: LineItem[] = []
                        for (const line of lines.slice(1)) {
                            const [code, text] = line.split(/:(.*)/s);
                            if (!code || !text) continue;
                            rows.push({code, text, translatedText: ''});
                        }
                        setRows(rows);
                    } else {
                        console.error(`Unsupported language code: ${originLang}`)
                        throw new Error(`Unsupported language code: ${originLang}`);
                    }
                }
            };

            reader.readAsText(file);
        }
    }, [file]);

    const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (files && files.length) {
            setFile(files[0])
        }
    }, [setFile])

    return (
        <input onInput={handleFileChange} type="file" accept="application/x-yaml" />
    )
}

export default FileSelector