'use client'

import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
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

const UploadedFileRedactor: React.FC<Props> = ({ className }) => {
    const { rows, updateRow, file, targetLang, translationStatus, updateTranslationStatus } = useContext(FileContext);
    const wsRef = useRef<WebSocket | null>(null);
    const [wsState, setWsState] = useState<'connecting' | 'open' | 'closed' | 'error'>('closed');
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const pingIntervalRef = useRef<NodeJS.Timeout>();

    const startPingInterval = () => {
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'ping' }));
            }
        }, 25000);
    };

    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            console.log('Received message:', event.data);
            const data = JSON.parse(event.data);
            if (data.type === 'pong') {
                return;
            }
            console.log('Parsed message:', data);
            
            if (data.type === 'translation') {
                console.log('Translation received:', data);
                const { rowId, translatedText } = data;
                console.log('Current rows:', rows);
                console.log('Looking for rowId:', rowId);
                
                const row = rows.find((r) => r.code === rowId);
                console.log('Row found:', row);
                
                if (row) {
                    console.log('Updating row:', row);
                    console.log('Translated text:', translatedText);
                    updateRow({ ...row, translatedText });
                    updateTranslationStatus(rowId, 'completed');
                }
            } else if (data.type === 'status') {
                const { rowId, status, error } = data;
                updateTranslationStatus(rowId, status);
                if (error) {
                    console.error(`Translation error for ${rowId}:`, error);
                }
            }
        } catch (error) {
            console.error('WebSocket message parse error:', error);
        }
    }, [rows, updateRow, updateTranslationStatus]);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        console.log('Connecting to WebSocket...');
        wsRef.current = new WebSocket('ws://localhost:3001', 'translator-protocol');
        setWsState('connecting');

        wsRef.current.onopen = () => {
            console.log('WebSocket connected');
            setWsState('open');
            startPingInterval();
        };

        wsRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setWsState('error');
        };

        wsRef.current.onclose = (event) => {
            console.log('WebSocket closed, code:', event.code, 'reason:', event.reason);
            setWsState('closed');
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
            
            if (event.code !== 1000) {
                console.log('Attempting to reconnect in 5s...');
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                }
                reconnectTimeoutRef.current = setTimeout(connect, 5000);
            }
        };
    }, []);

    useEffect(() => {
        if (wsRef.current) {
            wsRef.current.onmessage = handleMessage;
        }
    }, [handleMessage]);

    useEffect(() => {
        connect();

        return () => {
            if (wsRef.current) {
                console.log('Cleaning up WebSocket connection');
                wsRef.current.close(1000, 'Component unmounting');
                wsRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
        };
    }, [connect]);

    const handleTextChange = (index: number, newText: string) => {
        updateRow({ ...rows[index], text: newText });
    };

    const handleTranslatedTextChange = (index: number, newTranslatedText: string) => {
        if(!rows[index]) return;
        updateRow({ ...rows[index], translatedText: newTranslatedText });
    };

    const handleTranslate = (code: string, text: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('Sending translation request:', { code, text });
            wsRef.current.send(JSON.stringify({
                type: 'translate',
                text,
                targetLanguage: targetLang,
                rowId: code,
            }));
            updateTranslationStatus(code, 'queued');
        } else {
            console.error('WebSocket is not connected. Current state:', wsState);
            connect();
        }
    };

    const handleTranslateAll = () => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected. Current state:', wsState);
            connect();
            return;
        }

        rows.forEach((row) => {
            const status = translationStatus[row.code];
            if (status !== 'processing' && status !== 'queued' && !row.translatedText) {
                handleTranslate(row.code, row.text);
            }
        });
    };

    const handleGenerateFile = () => {
        if (!file) return;

        const fileName = file.name;
        const baseName = trimToSecondLastUnderscore(fileName);
        const targetFileName = `${baseName}_${targetLang}.yml`;

        let fileContent = `${targetLang}:\n`;
        rows.forEach((row) => {
            if (row.translatedText) {
                fileContent += ` ${row.code}:0 "${row.translatedText}"\n`;
            }
        });

        const blob = new Blob([fileContent], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = targetFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const hasUntranslatedRows = rows.some(row => {
        const status = translationStatus[row.code];
        return status !== 'processing' && status !== 'queued' && !row.translatedText;
    });

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
                hasUntranslatedRows={hasUntranslatedRows}
                isConnected={wsState === 'open'}
                fileName={file.name}
                targetLang={targetLang}
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
