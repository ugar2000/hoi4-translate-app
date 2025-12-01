'use client'

import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from 'socket.io-client';
import { FileContext } from "@/components/FileContext";
import RowTextArea from "@/components/UploadedFileRedactor/RowTextArea";
import TranslationHeader from "@/components/TranslationHeader";
import { Button } from '@/components/ui/button';
import { en } from '@/locales/en';
import { Loader2 } from 'lucide-react';
import { trimToSecondLastUnderscore } from "@/helpers";

interface Props {
    className?: string;
}

const SOCKET_BASE_URL = (process.env.NEXT_PUBLIC_API_WS_URL ?? 'http://localhost:3005').replace(/\/$/, '');
const SOCKET_NAMESPACE = `${SOCKET_BASE_URL}/translate`;
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005/api').replace(/\/$/, '');

type GatewayStatus = 'processing' | 'completed' | 'error';

const UploadedFileRedactor: React.FC<Props> = ({ className }) => {
    const { rows, updateRow, file, targetLang, originLang, translationStatus, updateTranslationStatus } = useContext(FileContext);
    const socketRef = useRef<Socket | null>(null);
    const joinedRowsRef = useRef<Set<string>>(new Set());
    const rowsRef = useRef(rows);
    const [wsState, setWsState] = useState<'connecting' | 'open' | 'closed' | 'error'>('closed');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        rowsRef.current = rows;
    }, [rows]);

    useEffect(() => {
        const socket = io(SOCKET_NAMESPACE, {
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
        });
        socketRef.current = socket;
        const joinedRooms = joinedRowsRef.current;

        const handleConnect = () => {
            setWsState('open');
            rowsRef.current.forEach((row) => {
                if (row.code && !joinedRooms.has(row.code)) {
                    socket.emit('join-row', { rowId: row.code });
                }
            });
        };

        const handleDisconnect = () => {
            setWsState('closed');
        };

        const handleError = (error: Error) => {
            console.error('WebSocket error:', error);
            setWsState('error');
        };

        const handleReconnectAttempt = () => {
            setWsState('connecting');
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleError);
        socket.on('reconnect_attempt', handleReconnectAttempt);
        socket.on('reconnect', handleConnect);
        socket.on('joined-row', ({ rowId }: { rowId?: string }) => {
            if (rowId) {
                joinedRooms.add(rowId);
            }
        });

        if (socket.connected) {
            handleConnect();
        } else {
            setWsState('connecting');
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleError);
            socket.off('reconnect_attempt', handleReconnectAttempt);
            socket.off('reconnect', handleConnect);
            socket.off('joined-row');
            socket.disconnect();
            socketRef.current = null;
            joinedRooms.clear();
        };
    }, []);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) {
            return;
        }

        const handleTranslation = (data: { rowId?: string; translatedText?: string }) => {
            if (!data?.rowId) {
                return;
            }

            const currentRows = rowsRef.current;
            const row = currentRows.find((r) => r.code === data.rowId);
            if (row && typeof data.translatedText === 'string') {
                updateRow({ ...row, translatedText: data.translatedText });
                updateTranslationStatus(data.rowId, 'completed');
            }
        };

        const handleStatus = (data: { rowId?: string; status?: GatewayStatus; error?: string }) => {
            if (!data?.rowId || !data.status) {
                return;
            }

            updateTranslationStatus(data.rowId, data.status);
            if (data.error) {
                console.error(`Translation error for ${data.rowId}:`, data.error);
            }
        };

        socket.on('translation', handleTranslation);
        socket.on('status', handleStatus);

        return () => {
            socket.off('translation', handleTranslation);
            socket.off('status', handleStatus);
        };
    }, [updateRow, updateTranslationStatus]);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !socket.connected) {
            return;
        }

        rows.forEach((row) => {
            if (row.code && !joinedRowsRef.current.has(row.code)) {
                socket.emit('join-row', { rowId: row.code });
            }
        });
    }, [rows]);

    const handleTextChange = (index: number, newText: string) => {
        updateRow({ ...rows[index], text: newText });
    };

    const handleTranslatedTextChange = (index: number, newTranslatedText: string) => {
        if(!rows[index]) return;
        updateRow({ ...rows[index], translatedText: newTranslatedText });
    };

    const ensureJoined = useCallback((rowId: string) => {
        const socket = socketRef.current;
        if (!socket || !rowId) {
            return;
        }

        if (!joinedRowsRef.current.has(rowId)) {
            socket.emit('join-row', { rowId });
        }
    }, []);

    const handleTranslate = (code: string, text: string) => {
        const socket = socketRef.current;
        if (!socket) {
            console.error('WebSocket is not initialized');
            return;
        }

        if (!socket.connected) {
            console.error('WebSocket is not connected. Current state:', wsState);
            setWsState('connecting');
            socket.connect();
            return;
        }

        ensureJoined(code);

        socket.emit('translate-row', {
            rowId: code,
            text,
            targetLanguage: targetLang,
        });
        updateTranslationStatus(code, 'queued');
    };

    const handleTranslateAll = () => {
        const socket = socketRef.current;
        if (!socket?.connected) {
            console.error('WebSocket is not connected. Current state:', wsState);
            socket?.connect();
            setWsState('connecting');
            return;
        }

        rows.forEach((row) => {
            const status = translationStatus[row.code];
            if (status !== 'processing' && status !== 'queued' && !row.translatedText) {
                handleTranslate(row.code, row.text);
            }
        });
    };

    const buildTranslatedFile = () => {
        if (!file) return null;

        const fileName = file.name;
        const baseName = trimToSecondLastUnderscore(fileName);
        const targetFileName = `${baseName}_${targetLang}.yml`;

        let fileContent = `${targetLang}:\n`;
        rows.forEach((row) => {
            if (row.translatedText) {
                fileContent += ` ${row.code}:0 "${row.translatedText}"\n`;
            }
        });

        return { fileName: targetFileName, content: fileContent };
    };

    const handleGenerateFile = () => {
        const translated = buildTranslatedFile();
        if (!translated) return;

        const blob = new Blob([translated.content], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = translated.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSaveTranslation = async () => {
        if (!file) {
            alert('Please upload a file before saving.');
            return;
        }

        const translated = buildTranslatedFile();
        if (!translated) {
            alert('Nothing to save yet.');
            return;
        }

        if (!targetLang) {
            alert('Please select a target language before saving.');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert('You need to be logged in to save your translation history.');
            return;
        }

        const sourceLang = originLang || 'unknown';

        const formData = new FormData();
        formData.append('originLang', sourceLang);
        formData.append('translatedLang', targetLang);
        formData.append('original', file, file.name);
        const translatedBlob = new Blob([translated.content], { type: 'text/yaml' });
        const translatedFile = new File([translatedBlob], translated.fileName, { type: 'text/yaml' });
        formData.append('translated', translatedFile);

        try {
            setIsSaving(true);
            const response = await fetch(`${API_BASE_URL}/history`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Failed to save translation (status ${response.status})`);
            }

            alert('Translation saved to your history.');
        } catch (error) {
            console.error('Failed to save translation', error);
            alert('Failed to save translation history. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const hasUntranslatedRows = rows.some(row => {
        const status = translationStatus[row.code];
        return status !== 'processing' && status !== 'queued' && !row.translatedText;
    });

    const hasTranslatedRows = rows.some(row => row.translatedText && row.translatedText.trim().length > 0);

    if (!file || rows.length === 0) return null;

    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            {wsState !== 'open' && (
                <div className="p-2 text-sm bg-yellow-100 text-yellow-800 rounded">
                    WebSocket Status: {wsState}
                </div>
            )}
            <TranslationHeader
                onTranslateAll={handleTranslateAll}
                onGenerateFile={handleGenerateFile}
                onSaveTranslation={handleSaveTranslation}
                hasUntranslatedRows={hasUntranslatedRows}
                isConnected={wsState === 'open'}
                fileName={file.name}
                targetLang={targetLang}
                canSave={hasTranslatedRows}
                isSaving={isSaving}
            />
            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2">
                {rows.map((row, index) => (
                    <React.Fragment key={index}>
                        <div className="font-mono text-sm text-black text-left pr-2 whitespace-nowrap">
                            {row.code || ''}
                        </div>
                        <RowTextArea
                            value={row.text}
                            onBlur={(value) => handleTextChange(index, value)}
                            onInput={(e) => {e.target.style.height = "auto"; e.target.style.height = (e.target.scrollHeight)+"px";}}
                            className={`resize-none p-1 border border-gray-300 rounded`}
                        />
                        <RowTextArea
                            value={row.translatedText || ''}
                            onBlur={(value) => handleTranslatedTextChange(index, value)}
                            onInput={(e) => {e.target.style.height = "auto"; e.target.style.height = (e.target.scrollHeight)+"px";}}
                            className={`resize-none p-1 border border-gray-300 rounded`}
                        />
                        <Button
                            onClick={() => handleTranslate(row.code, row.text)}
                            variant="default"
                            size="sm"
                            disabled={['queued', 'processing'].includes(translationStatus[row.code] || 'idle') || wsState !== 'open'}
                        >
                            {['queued', 'processing'].includes(translationStatus[row.code] || 'idle') ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                en.actions.translate
                            )}
                        </Button>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default UploadedFileRedactor;
