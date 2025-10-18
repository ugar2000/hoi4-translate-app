import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
    className?: string;
    onTranslateAll: () => void;
    onGenerateFile: () => void;
    onSaveTranslation: () => void;
    hasUntranslatedRows: boolean;
    isConnected: boolean;
    fileName: string;
    targetLang: string;
    canSave: boolean;
    isSaving: boolean;
}

const TranslationHeader: React.FC<Props> = ({
    className,
    onTranslateAll,
    onGenerateFile,
    onSaveTranslation,
    hasUntranslatedRows,
    isConnected,
    fileName,
    targetLang,
    canSave,
    isSaving
}) => {
    return (
        <div className={`flex justify-between items-center mb-4 ${className}`}>
            <h2 className="text-lg text-black font-semibold">Translation Queue</h2>
            <div className="flex gap-2">
                <Button
                    onClick={onTranslateAll}
                    disabled={!hasUntranslatedRows || !isConnected}
                    variant="default"
                    size="sm"
                >
                    Translate All
                </Button>
                <Button
                    onClick={onGenerateFile}
                    disabled={!isConnected}
                    variant="outline"
                    size="sm"
                >
                    Generate {targetLang} File
                </Button>
                <Button
                    onClick={onSaveTranslation}
                    disabled={!canSave || isSaving}
                    variant="secondary"
                    size="sm"
                >
                    {isSaving ? 'Saving…' : 'Save Translation'}
                </Button>
            </div>
        </div>
    );
};

export default TranslationHeader;
