// app/layout.tsx
// Pana ERP v1.3 - Root Layout with next/font
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import LayoutClient from "./LayoutClient";
import "./globals.css";

// Premium font loading with next/font (optimized, no layout shift)
// Plus Jakarta Sans - Modern, Clean, Premium feel (used by Vercel, Linear)
const jakarta = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Pana ERP",
  description: "Enterprise Resource Planning - Premium Business Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('pana-erp-theme') || 'system';
                  let resolved = theme;
                  
                  if (theme === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(resolved);
                  document.documentElement.setAttribute('data-theme', resolved);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${jakarta.className} m-0 p-0 overflow-x-hidden min-h-screen bg-background font-sans`}
      >
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
