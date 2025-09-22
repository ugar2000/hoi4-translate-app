import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Background } from "@/components/ui/background";
import AuthHeader from "@/components/AuthHeader";

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
    <html lang="en">
      <body className={inter.className}>
        <Background>
          <AuthHeader />
          {children}
        </Background>
      </body>
    </html>
  );
}
