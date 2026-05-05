import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/lib/theme";
import { ToastContainer } from "@/components/Toast";
import { Chatbot } from "@/components/Chatbot";
import { AuthSync } from "@/components/AuthSync";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareerBuilder | Meet your future",
  description: "Upload your resume and get instant, AI-driven job recommendations tailored to your skills.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${jakartaSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-accent/20 selection:text-accent">
        <ThemeProvider>
          <SessionProvider>
            <AuthSync />
            <Navbar />
            <main className="flex-1 flex flex-col w-full relative">
              {children}
            </main>
            <ToastContainer />
            <Chatbot />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
