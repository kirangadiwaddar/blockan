import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PWARegister } from "@/components/pwa-register";
import { PWAInstallBanner } from "@/components/pwa-install-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Blockan", template: "%s · Blockan" },
  description: "Project tracker and issue management for modern teams",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Blockan",
    startupImage: "/icon-512.png",
  },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* Runs synchronously before React hydrates — prevents dark/accent flash */}
      <head>
        <meta name="theme-color" content="#0f172a" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
  var t=localStorage.getItem('theme');
  if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  if(t==='dark'){document.documentElement.classList.add('dark');}
  var palette={
    zinc:  {p:'oklch(0.205 0 0)',      f:'oklch(0.985 0 0)',r:'oklch(0.205 0 0)'},
    blue:  {p:'oklch(0.546 0.245 262.881)',f:'oklch(0.985 0 0)',r:'oklch(0.546 0.245 262.881)'},
    violet:{p:'oklch(0.558 0.288 302.3)',  f:'oklch(0.985 0 0)',r:'oklch(0.558 0.288 302.3)'},
    rose:  {p:'oklch(0.596 0.232 16.053)', f:'oklch(0.985 0 0)',r:'oklch(0.596 0.232 16.053)'},
    orange:{p:'oklch(0.646 0.222 41.116)', f:'oklch(0.985 0 0)',r:'oklch(0.646 0.222 41.116)'},
    green: {p:'oklch(0.527 0.154 162.487)',f:'oklch(0.985 0 0)',r:'oklch(0.527 0.154 162.487)'},
    indigo:{p:'oklch(0.511 0.262 276.966)',f:'oklch(0.985 0 0)',r:'oklch(0.511 0.262 276.966)'},
    teal:  {p:'oklch(0.533 0.126 185.842)',f:'oklch(0.985 0 0)',r:'oklch(0.533 0.126 185.842)'}
  };
  var a=localStorage.getItem('accentColor');
  var c=palette[a]||palette.zinc;
  var d=document.documentElement;
  d.style.setProperty('--primary',c.p);
  d.style.setProperty('--primary-foreground',c.f);
  d.style.setProperty('--ring',c.r);
}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col"><Providers>{children}</Providers><PWARegister /><PWAInstallBanner /></body>
    </html>
  );
}
