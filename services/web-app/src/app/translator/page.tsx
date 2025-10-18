import FileSelector from "@/components/FileSelector";
import {FileContextProvider} from "@/components/FileContext";
import UploadedFileRedactor from "@/components/UploadedFileRedactor";
import AppLayout from "@/components/AppLayout";

export default function TranslatorPage() {
  return (
    <AppLayout>
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <FileContextProvider>
          <FileSelector />
          <div className="w-full flex flex-row justify-between">
            <UploadedFileRedactor />
          </div>
        </FileContextProvider>
      </div>
    </AppLayout>
  );
}
