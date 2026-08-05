import ThemeRegistry from "@/components/ThemeRegistry.jsx";
import { AppProvider } from "@/context/AppContext.jsx";
import { AppShell } from "@/components/AppShell.jsx";
import "./globals.css";

export const metadata = {
  title: "Converge Projects",
  description: "Enterprise project management for Converge's Software, Vision, and Automation teams.",
  icons: {
    icon: "/ApplicationIcon.png",
    shortcut: "/ApplicationIcon.png",
    apple: "/ApplicationIcon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <AppProvider>
            <AppShell>{children}</AppShell>
          </AppProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
