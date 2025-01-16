'use client'

import React, {ChangeEvent, useCallback, useContext, useEffect, useState} from "react";
import {FileContext} from "@/components/FileContext";
import {LANGUAGE_CODES, LineItem} from "@/types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { en } from "@/locales/en";

const FileAndLanguageSelector = () => {
    const {setFile, file, setOriginLang, setRows, setTargetLang} = useContext(FileContext)
    const [selectedLanguage, setSelectedLanguage] = useState<LANGUAGE_CODES | ''>('');

    useEffect(() => {
        if (file && selectedLanguage) {
            const reader = new FileReader();

            reader.onload = (event) => {
                const yamlContent = event.target?.result;

                if (yamlContent) {
                    const lines = (yamlContent as String).split('\n');
                    setOriginLang(selectedLanguage);
                    const rows: LineItem[] = []
                    for (const line of lines) {

                        if (!line.trim() || line.trim().startsWith('#') || line.trim().slice(-1) === ':') continue;
                        
                        const [code, text] = line.split(/:(.*)/s);
                        if (!code || !text) continue;
                        rows.push({code: code.trim(), text, translatedText: ''});
                    }
                    setRows(rows);
                }
            };

            reader.readAsText(file);
        }
    }, [file, selectedLanguage]);

    const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (files && files.length) {
            setFile(files[0])
        }
    }, [setFile])

    const handleClearFile = useCallback(() => {
        setFile(null);
        setSelectedLanguage('');
        setRows([]);
        setOriginLang('' as LANGUAGE_CODES);
    }, [setFile, setRows, setOriginLang]);

    const handleLanguageChange = useCallback((value: LANGUAGE_CODES) => {
        setSelectedLanguage(value);
        setTargetLang(value);
    }, [setTargetLang]);

    return (
        <div className="flex flex-col gap-4">
            <Select
                value={selectedLanguage}
                onValueChange={handleLanguageChange}
                disabled={!file}
            >
                <SelectTrigger>
                    <SelectValue placeholder={en.languageSelect.placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {Object.values(LANGUAGE_CODES).map((lang) => (
                        <SelectItem key={lang} value={lang}>
                            {en.languageSelect[lang.toLowerCase() as keyof typeof en.languageSelect] || lang}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            
            {!file ? (
                <FileInput
                    onInput={handleFileChange}
                    accept="application/x-yaml"
                    aria-label={en.fileInput.selectFile}
                />
            ) : (
                <Button
                    onClick={handleClearFile}
                    variant="destructive"
                >
                    {en.fileInput.clearFile}
                </Button>
            )}
            
            {file && (
                <div className="text-sm text-gray-500">
                    {en.fileInput.selectedFile} {file.name}
                </div>
            )}
        </div>
    )
}

export default FileAndLanguageSelector