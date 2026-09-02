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
        {/* Redux store outermost (providers fetch through RTK Query). AuthProvider
            wraps OrgProvider so the org-directory fetch can wait for a session —
            fetching it on the login screen (no token) 401s and RTK caches the
            error, leaving every owner/assignee name unresolved after login. */}
        <GlobalReduxProvider>
          <AuthProvider>
            <OrgProvider>
              <AppProvider>
                <ThemeRegistry>
                  <AuthGate>{children}</AuthGate>
                </ThemeRegistry>
              </AppProvider>
            </OrgProvider>
          </AuthProvider>
        </GlobalReduxProvider>
      </body>
    </html>
  );
}
