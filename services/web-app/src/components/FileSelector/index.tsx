'use client'

import React, {
    ChangeEvent,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { FileContext } from "@/components/FileContext";
import { LANGUAGE_CODES } from "@/types/legacy.types";
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
import { fileProcessingService } from "@/services/file-processing.service";

const FileAndLanguageSelector = () => {
    const {
        setFile,
        file,
        setOriginLang,
        setRows,
        setTargetLang,
        setFileId,
        setUploadJobId,
        processingState,
        setProcessingState,
        processingError,
        setProcessingError,
    } = useContext(FileContext)
    const [selectedLanguage, setSelectedLanguage] = useState<LANGUAGE_CODES | ''>('');
    const lastRequestRef = useRef<string | null>(null);

    const uploadSignature = useMemo(() => {
        if (!file || !selectedLanguage) {
            return null;
        }
        return `${file.name}:${file.size}:${file.lastModified}:${selectedLanguage}`;
    }, [file, selectedLanguage]);

    const startProcessing = useCallback(
        async (force = false) => {
            if (!file || !selectedLanguage || !uploadSignature) {
                return;
            }

            if (!force && lastRequestRef.current === uploadSignature) {
                return;
            }

            lastRequestRef.current = uploadSignature;
            setProcessingState('uploading');
            setProcessingError(null);

            try {
                const response = await fileProcessingService.start(file, selectedLanguage);
                setFileId(response.fileId);
                setUploadJobId(response.uploadJobId);
                setProcessingState('queued');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to start processing';
                setProcessingState('error');
                setProcessingError(message);
                lastRequestRef.current = null;
            }
        },
        [
            file,
            selectedLanguage,
            uploadSignature,
            setFileId,
            setUploadJobId,
            setProcessingError,
            setProcessingState,
        ],
    );

    useEffect(() => {
        if (!file || !selectedLanguage || !uploadSignature) {
            lastRequestRef.current = null;
            setProcessingState('idle');
            setProcessingError(null);
            setFileId(null);
            setUploadJobId(null);
            return;
        }

        startProcessing();
    }, [
        file,
        selectedLanguage,
        uploadSignature,
        setFileId,
        setUploadJobId,
        setProcessingState,
        setProcessingError,
        startProcessing,
    ]);

    const resetProcessingState = useCallback(() => {
        setFileId(null);
        setUploadJobId(null);
        setProcessingState('idle');
        setProcessingError(null);
        lastRequestRef.current = null;
    }, [
        setFileId,
        setUploadJobId,
        setProcessingState,
        setProcessingError,
    ]);

    const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length) {
            setFile(files[0]);
            setSelectedLanguage('');
            setTargetLang('' as LANGUAGE_CODES);
            setOriginLang('' as LANGUAGE_CODES);
            setRows([]);
            resetProcessingState();
        }
    }, [resetProcessingState, setFile, setOriginLang, setRows, setSelectedLanguage, setTargetLang]);

    const handleClearFile = useCallback(() => {
        setFile(null);
        setSelectedLanguage('');
        setRows([]);
        setOriginLang('' as LANGUAGE_CODES);
        setTargetLang('' as LANGUAGE_CODES);
        resetProcessingState();
    }, [
        resetProcessingState,
        setFile,
        setRows,
        setOriginLang,
        setTargetLang,
    ]);

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

            {file && processingState === 'uploading' && (
                <div className="text-sm text-blue-600">
                    Uploading file to the translation pipeline…
                </div>
            )}
            {file && processingState === 'queued' && (
                <div className="text-sm text-green-600">
                    File uploaded. Ingest pipeline will start shortly.
                </div>
            )}
            {file && processingState === 'completed' && (
                <div className="text-sm text-green-600">
                    File processed. Streaming translated rows…
                </div>
            )}
            {processingState === 'error' && processingError && (
                <div className="text-sm text-red-600">
                    {processingError}
                </div>
            )}
            {file && selectedLanguage && (
                <div className="flex gap-2">
                    <Button
                        onClick={() => startProcessing(true)}
                        variant="secondary"
                        size="sm"
                        disabled={processingState === 'uploading'}
                    >
                        {processingState === 'uploading' ? 'Uploading…' : 'Restart Upload'}
                    </Button>
                </div>
            )}
        </div>
    )
}

export default FileAndLanguageSelector
