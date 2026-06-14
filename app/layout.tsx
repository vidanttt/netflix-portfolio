import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TransitionProvider from "@/components/TransitionProvider";
import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vidaant :)",
  description: "okkay",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/Bored"
      signUpFallbackRedirectUrl="/Bored"
      afterSignOutUrl="/Bored"
      appearance={{
        variables: {
          colorPrimary: '#ffffff',
          colorBackground: '#0b0b0b',
          colorForeground: '#ffffff',
          colorMutedForeground: '#a1a1a1',
          colorPrimaryForeground: '#000000',
          colorInputForeground: '#ffffff',
          colorInput: 'rgba(255, 255, 255, 0.04)',
        },
        elements: {
          formFieldLabel: {
            color: '#a1a1a1 !important',
            fontWeight: '500 !important',
          },
          footerActionText: {
            color: '#a1a1a1 !important',
          },
          card: {
            background: 'rgba(24, 24, 24, 0.65) !important',
            backdropFilter: 'blur(40px) saturate(1.4) !important',
            WebkitBackdropFilter: 'blur(40px) saturate(1.4) !important',
            border: '1px solid rgba(255, 255, 255, 0.08) !important',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important',
            borderRadius: '20px !important',
          },
          userButtonPopoverCard: {
            background: 'rgba(24, 24, 24, 0.75) !important',
            backdropFilter: 'blur(40px) saturate(1.4) !important',
            WebkitBackdropFilter: 'blur(40px) saturate(1.4) !important',
            border: '1px solid rgba(255, 255, 255, 0.08) !important',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5) !important',
            borderRadius: '16px !important',
          },
          formButtonPrimary: {
            backgroundColor: '#ffffff !important',
            color: '#000000 !important',
            fontWeight: '600 !important',
            borderRadius: '9999px !important',
            textTransform: 'uppercase !important',
            fontSize: '13px !important',
            letterSpacing: '0.5px !important',
            '&:hover': {
              backgroundColor: '#e5e5e5 !important',
            }
          },
          socialButtonsBlockButton: {
            border: '1px solid rgba(255, 255, 255, 0.08) !important',
            backgroundColor: 'rgba(255, 255, 255, 0.03) !important',
            color: '#ffffff !important',
            borderRadius: '9999px !important',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08) !important',
            }
          },
          formFieldInput: {
            backgroundColor: 'rgba(255, 255, 255, 0.04) !important',
            border: '1px solid rgba(255, 255, 255, 0.08) !important',
            color: '#ffffff !important',
            borderRadius: '12px !important',
            '&:focus': {
              border: '1px solid rgba(255, 255, 255, 0.2) !important',
            }
          },
          footerActionLink: {
            color: '#ffffff !important',
            fontWeight: '600 !important',
            '&:hover': {
              color: '#a1a1a1 !important',
            }
          },
          identityPreviewText: {
            color: '#ffffff !important',
          },
          identityPreviewEditButtonIcon: {
            color: '#ffffff !important',
          },
          headerTitle: {
            color: '#ffffff !important',
            fontWeight: '800 !important',
          },
          headerSubtitle: {
            color: '#a1a1a1 !important',
          },
          dividerText: {
            color: '#6b6b6b !important',
          },
          dividerLine: {
            backgroundColor: 'rgba(255, 255, 255, 0.08) !important',
          }
        }
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <TransitionProvider>
            {children}
          </TransitionProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

