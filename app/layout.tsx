import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artheon Energy | Dealer Portal",
  description: "Solar supplies, simpler. Explore the Artheon Energy catalogue and manage your dealer orders.",
  icons: {
    icon: "/images/artheon-logo.png",
    shortcut: "/images/artheon-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
