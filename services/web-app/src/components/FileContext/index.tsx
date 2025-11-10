'use client'

import { LANGUAGE_CODES, LineItem } from "@/types/legacy.types";
import React, {
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";

interface IProps {
  children: ReactNode;
}

type ProcessingState = 'idle' | 'uploading' | 'queued' | 'error' | 'completed';

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
  fileId: string | null;
  setFileId: (fileId: string | null) => void;
  uploadJobId: string | null;
  setUploadJobId: (jobId: string | null) => void;
  processingState: ProcessingState;
  setProcessingState: (state: ProcessingState) => void;
  processingError: string | null;
  setProcessingError: (message: string | null) => void;
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
    fileId: null,
    setFileId: () => {},
    uploadJobId: null,
    setUploadJobId: () => {},
    processingState: 'idle',
    setProcessingState: () => {},
    processingError: null,
    setProcessingError: () => {},
};

const FileContext = React.createContext<FileContextType>(FileContextDefaultValues);

const SOCKET_BASE_URL = (process.env.NEXT_PUBLIC_API_WS_URL ?? 'http://localhost:3005').replace(/\/$/, '');
const FILE_NAMESPACE = `${SOCKET_BASE_URL}/files`;

type ChunkLinePayload = {
  line_no: number;
  text: string;
  original?: string;
};

const stripQuotes = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.substring(1, trimmed.length - 1);
  }
  return trimmed;
};

const parseChunkLine = (raw: string, fallbackCode: string) => {
  const rawText = raw ?? '';
  const trimmed = rawText.trim();
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx === -1) {
    return {
      code: trimmed || fallbackCode,
      value: '',
    };
  }
  const code = trimmed.slice(0, colonIdx).trim() || fallbackCode;
  const remainder = trimmed.slice(colonIdx + 1).trim();
  const value = stripQuotes(remainder);
  return { code, value };
};

const FileContextProvider: React.FC<IProps> = ({children}) => {
    const [file, setFile] = React.useState<File | null>(null);
    const [rows, setRows] = React.useState<LineItem[]>([]);
    const [originLang, setOriginLang] = React.useState<LANGUAGE_CODES>('' as LANGUAGE_CODES);
    const [targetLang, setTargetLang] = React.useState<LANGUAGE_CODES>('' as LANGUAGE_CODES);
    const [translationStatus, setTranslationStatus] = useState<TranslationStatus>({});
    const [fileId, setFileId] = useState<string | null>(null);
    const [uploadJobId, setUploadJobId] = useState<string | null>(null);
    const [processingState, setProcessingState] = useState<ProcessingState>('idle');
    const [processingError, setProcessingError] = useState<string | null>(null);
    const fileSocketRef = useRef<Socket | null>(null);

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

    const mergeChunkLines = useCallback((lines: ChunkLinePayload[]) => {
        if (!lines?.length) {
            return;
        }
        setRows((prev) => {
            const map = new Map<number, LineItem>();
            prev.forEach((row) => {
                if (row.lineNo != null) {
                    map.set(row.lineNo, row);
                } else {
                    map.set(map.size + 1, row);
                }
            });
            lines.forEach((line) => {
                const maybeHeader = (line.original ?? line.text ?? '').trim();
                const headerMatch = maybeHeader.match(/^([A-Za-z0-9_]+):/);
                if (line.line_no === 1 && headerMatch) {
                    setOriginLang(headerMatch[1] as LANGUAGE_CODES);
                    return;
                }
                const fallbackCode = `line_${line.line_no}`;
                const parsedOriginal = parseChunkLine(
                    line.original ?? line.text,
                    fallbackCode,
                );
                const parsedTranslated = parseChunkLine(
                    line.text,
                    parsedOriginal.code,
                );
                const existing = map.get(line.line_no);
                map.set(line.line_no, {
                    code: parsedOriginal.code,
                    text: parsedOriginal.value || existing?.text || '',
                    translatedText: parsedTranslated.value,
                    lineNo: line.line_no,
                });
            });
            return Array.from(map.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([, row]) => row);
        });
        setTranslationStatus((prev) => {
            const next = { ...prev };
            lines.forEach((line) => {
                if (line.line_no === 1) {
                    return;
                }
                const fallbackCode = `line_${line.line_no}`;
                const parsedOriginal = parseChunkLine(
                    line.original ?? line.text,
                    fallbackCode,
                );
                if (parsedOriginal.code) {
                    next[parsedOriginal.code] = 'completed';
                }
            });
            return next;
        });
    }, [setRows, setTranslationStatus, setOriginLang]);

    useEffect(() => {
        setRows([]);
        setTranslationStatus({});
        if (!fileId) {
            if (fileSocketRef.current) {
                fileSocketRef.current.disconnect();
                fileSocketRef.current = null;
            }
            return;
        }

        const socket = io(FILE_NAMESPACE, {
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
        });
        fileSocketRef.current = socket;

        const joinRoom = () => {
            socket.emit('join-job', { jobId: fileId });
        };

        socket.on('connect', joinRoom);
        socket.on('chunk-ready', (payload: { fileId?: string; lines?: ChunkLinePayload[] }) => {
            if (!payload || payload.fileId !== fileId) {
                return;
            }
            mergeChunkLines(payload.lines ?? []);
        });
        socket.on('file-status', (payload: { status?: string; error?: string }) => {
            if (!payload) {
                return;
            }
            if (payload.status === 'failed') {
                setProcessingState('error');
                setProcessingError(payload.error ?? 'File processing failed');
            }
            if (payload.status === 'completed') {
                setProcessingState('completed');
            }
        });

        return () => {
            socket.off('connect', joinRoom);
            socket.off('chunk-ready');
            socket.off('file-status');
            socket.disconnect();
            fileSocketRef.current = null;
        };
    }, [fileId, mergeChunkLines, setProcessingError, setProcessingState]);

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
                fileId,
                setFileId,
                uploadJobId,
                setUploadJobId,
                processingState,
                setProcessingState,
                processingError,
                setProcessingError,
            }}
        >
            {children}
        </FileContext.Provider>
    );
};

export { FileContextProvider, FileContext };
export type { ProcessingState };
