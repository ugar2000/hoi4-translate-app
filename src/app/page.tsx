import FileSelector from "@/components/FileSelector";
import {FileContextProvider} from "@/components/FileContext";
import UploadedFileRedactor from "@/components/UploadedFileRedactor";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-none bg-amber-50 items-center p-24">
        <FileContextProvider>
            <FileSelector />
            <div className="w-full flex flex-row justify-between">
                <UploadedFileRedactor />
            </div>
        </FileContextProvider>
    </main>
  );
}
