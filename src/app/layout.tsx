import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Noto_Serif_Bengali, Lora } from "next/font/google";
import { LangProvider } from "@/lib/lang";
import { ChatProvider } from "@/context/ChatContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatFloatingLauncher } from "@/components/chat/ChatFloatingLauncher";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const notoSerifBengali = Noto_Serif_Bengali({
  variable: "--font-noto-serif-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1b4332",
};

export const metadata: Metadata = {
  title: "Nothi AI (নথি এআই) — Legal Document Vetting",
  description:
    "Deterministic auditing of Bangladeshi property transfer documents: Saf Kabala deeds, RS/BS Khatians, and National IDs. By Team Boron at Pointfex.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} ${jetbrainsMono.variable} ${notoSerifBengali.variable} h-full antialiased`}
    >
      <body className={`${inter.className} flex min-h-full flex-col bg-background text-foreground antialiased selection:bg-green-deep selection:text-paper`}>
        <LangProvider>
          <ChatProvider>
            <Header />
            <main id="main-content" className="flex-1 w-full">{children}</main>
            <Footer />
            <ChatFloatingLauncher />
          </ChatProvider>
        </LangProvider>
      </body>
    </html>
  );
}
