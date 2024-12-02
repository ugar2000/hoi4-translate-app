'use client'

import {LANGUAGE_CODES, LineItem} from "@/types";
import React, {ReactNode} from "react";

interface IProps {
  children: ReactNode;
}

interface FileContextType {
  file: File | null;
  setFile: (file: File) => void;
  rows: LineItem[];
  setRows: (rows: LineItem[]) => void;
  addRow: (row: LineItem) => void;
  originLang: LANGUAGE_CODES,
  targetLang: LANGUAGE_CODES,
  setOriginLang: (lang: LANGUAGE_CODES) => void;
  setTargetLang: (lang: LANGUAGE_CODES) => void;
  updateRow: (row: LineItem) => void;
}

const FileContextDefaultValues: FileContextType = {
    file: null,
    setFile: () => {},
    rows: [],
    setRows: () => {},
    addRow: () => {},
    originLang: LANGUAGE_CODES.ENGLISH,
    targetLang: LANGUAGE_CODES.ENGLISH,
    setOriginLang: () => {},
    setTargetLang: () => {},
    updateRow: () => {},
};

const FileContext = React.createContext<FileContextType>(FileContextDefaultValues);

const FileContextProvider: React.FC<IProps> = ({children}) => {
    const [file, setFile] = React.useState<File | null>(null);
    const [rows, setRows] = React.useState<LineItem[]>([]);
    const [originLang, setOriginLang] = React.useState<LANGUAGE_CODES>(LANGUAGE_CODES.ENGLISH);
    const [targetLang, setTargetLang] = React.useState<LANGUAGE_CODES>(LANGUAGE_CODES.ENGLISH);

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
    }

    return (
        <FileContext.Provider value={{file, setFile, rows, setRows, addRow, originLang, targetLang, setOriginLang, setTargetLang, updateRow}}>
          {children}
        </FileContext.Provider>
    );
}

export {FileContextProvider, FileContext};