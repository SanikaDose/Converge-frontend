import type { Metadata } from "next";
import type { ReactNode } from "react";
import ThemeRegistry from "@/components/ThemeRegistry";
import GlobalReduxProvider from "@/Providers/GlobalReduxProvider";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { OrgProvider } from "@/context/OrgContext";
import { AuthGate } from "@/components/AuthGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "Converge Projects",
  description: "Enterprise project management for Converge's Software, Vision, and Automation teams.",
  icons: {
    icon: "/ApplicationIcon.png",
    shortcut: "/ApplicationIcon.png",
    apple: "/ApplicationIcon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Outermost: OrgProvider and AuthProvider now fetch through RTK
            Query, so the store has to exist above them. */}
        <GlobalReduxProvider>
          <OrgProvider>
            <AuthProvider>
              <AppProvider>
                <ThemeRegistry>
                  <AuthGate>{children}</AuthGate>
                </ThemeRegistry>
              </AppProvider>
            </AuthProvider>
          </OrgProvider>
        </GlobalReduxProvider>
      </body>
    </html>
  );
}
