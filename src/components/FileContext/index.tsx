'use client'

import {LANGUAGE_CODES, LineItem} from "@/types";
import React, {ReactNode, useState} from "react";

interface IProps {
  children: ReactNode;
}

interface TranslationStatus {
  [key: string]: 'idle' | 'queued' | 'processing' | 'completed' | 'error';
}

interface FileContextType {
  file: File | null;
  setFile: (file: File | null) => void;
  rows: LineItem[];
  setRows: (rows: LineItem[]) => void;
  addRow: (row: LineItem) => void;
  originLang: LANGUAGE_CODES;
  targetLang: LANGUAGE_CODES;
  setOriginLang: (lang: LANGUAGE_CODES) => void;
  setTargetLang: (lang: LANGUAGE_CODES) => void;
  updateRow: (row: LineItem) => void;
  translationStatus: TranslationStatus;
  setTranslationStatus: (status: TranslationStatus) => void;
  updateTranslationStatus: (rowId: string, status: TranslationStatus[string]) => void;
}

const FileContextDefaultValues: FileContextType = {
    file: null,
    setFile: () => {},
    rows: [],
    setRows: () => {},
    addRow: () => {},
    originLang: '' as LANGUAGE_CODES,
    targetLang: '' as LANGUAGE_CODES,
    setOriginLang: () => {},
    setTargetLang: () => {},
    updateRow: () => {},
    translationStatus: {},
    setTranslationStatus: () => {},
    updateTranslationStatus: () => {},
};

const FileContext = React.createContext<FileContextType>(FileContextDefaultValues);

const FileContextProvider: React.FC<IProps> = ({children}) => {
    const [file, setFile] = React.useState<File | null>(null);
    const [rows, setRows] = React.useState<LineItem[]>([]);
    const [originLang, setOriginLang] = React.useState<LANGUAGE_CODES>('' as LANGUAGE_CODES);
    const [targetLang, setTargetLang] = React.useState<LANGUAGE_CODES>('' as LANGUAGE_CODES);
    const [translationStatus, setTranslationStatus] = useState<TranslationStatus>({});

    const addRow = (row: LineItem) => {
      setRows([...rows, row]);
    };

    const updateRow = (row: LineItem) => {
        const newRows = [...rows];
        const index = newRows.findIndex((r) => r.code === row.code);
        if (index !== -1) {
            newRows[index] = row;
            setRows(newRows);
        }
    };

    const updateTranslationStatus = (rowId: string, status: TranslationStatus[string]) => {
        setTranslationStatus(prev => ({
            ...prev,
            [rowId]: status
        }));
    };

    return (
        <FileContext.Provider
            value={{
                file,
                setFile,
                rows,
                setRows,
                addRow,
                originLang,
                targetLang,
                setOriginLang,
                setTargetLang,
                updateRow,
                translationStatus,
                setTranslationStatus,
                updateTranslationStatus,
            }}
        >
            {children}
        </FileContext.Provider>
    );
};

export {FileContextProvider, FileContext};