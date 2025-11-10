import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Background } from "@/components/ui/background";
import AuthHeader from "@/components/AuthHeader";
import { QueryProvider } from "@/providers/query-provider";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Paradox Translator",
  description: "A tool for translating Paradox game files",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full w-full m-0 p-0`}>
        <ErrorBoundary>
          <QueryProvider>
            <Background className="w-full h-full">
              <AuthHeader />
              <div className="w-full">
                {children}
              </div>
            </Background>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
