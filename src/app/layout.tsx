import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import {
  ThemeProvider,
  ThemeStyleProvider,
} from "@/components/layouts/theme-provider";
import { Toaster } from "ui/sonner";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { SpeedInsightsWrapper } from "@/components/speed-insights-wrapper";
import { Analytics } from "@vercel/analytics/next";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});
const seasonMix = localFont({
  src: [
    {
      path: "../../public/fonts/SeasonMix-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/SeasonMix-Light.woff",
      weight: "300",
      style: "normal",
    },
  ],
  variable: "--font-season",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Samba Agentic Suite",
  description:
    "Samba Agentic Suite is an AI chatbot platform that uses advanced tools to answer questions.",
};

// const themes = BASE_THEMES.flatMap((t) => [t, `${t}-dark`]);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${seasonMix.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          themes={["light", "dark"]}
          storageKey="app-theme-v2"
          disableTransitionOnChange
        >
          <ThemeStyleProvider>
            <NextIntlClientProvider>
              <div id="root">
                {children}
                <Toaster richColors />
              </div>
              <SpeedInsightsWrapper />
            </NextIntlClientProvider>
          </ThemeStyleProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
