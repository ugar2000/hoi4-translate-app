import { Suspense, lazy } from 'react'
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoadingSpinner } from "@/components/LoadingSpinner";

// Lazy load components to prevent webpack module loading issues
const FileSelector = lazy(() => import("@/components/FileSelector"))
const FileContextProvider = lazy(() => import("@/components/FileContext").then(module => ({ default: module.FileContextProvider })))
const UploadedFileRedactor = lazy(() => import("@/components/UploadedFileRedactor"))
const AppLayout = lazy(() => import("@/components/AppLayout"))

function TranslatorContent() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading layout..." className="min-h-screen" />}>
      <AppLayout>
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <Suspense fallback={<LoadingSpinner message="Loading file context..." />}>
            <FileContextProvider>
              <Suspense fallback={<LoadingSpinner message="Loading file selector..." />}>
                <FileSelector />
              </Suspense>
              <div className="w-full flex flex-row justify-between">
                <Suspense fallback={<LoadingSpinner message="Loading file editor..." />}>
                  <UploadedFileRedactor />
                </Suspense>
              </div>
            </FileContextProvider>
          </Suspense>
        </div>
      </AppLayout>
    </Suspense>
  );
}

export default function TranslatorPage() {
  return (
    <ProtectedRoute fallback={<LoadingSpinner message="Checking authentication..." className="min-h-screen" />}>
      <Suspense fallback={<LoadingSpinner message="Loading translator..." className="min-h-screen" />}>
        <TranslatorContent />
      </Suspense>
    </ProtectedRoute>
  );
}
