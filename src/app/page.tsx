import FileSelector from "@/components/FileSelector";
import {FileContextProvider} from "@/components/FileContext";
import UploadedFileRedactor from "@/components/UploadedFileRedactor";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6">
        <FileContextProvider>
            <FileSelector />
            <div className="w-full flex flex-row justify-between">
                <UploadedFileRedactor />
            </div>
        </FileContextProvider>
      </div>
    </main>
  );
}
