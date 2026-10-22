import type { Metadata } from "next";
import "./globals.css";
import {ClerkProvider} from "@clerk/nextjs";

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
      <body className="antialiased"><ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" signInForceRedirectUrl="/" signUpForceRedirectUrl="/" localization={{signIn:{start:{title:"Sign in to Artheon Energy"}},signUp:{start:{title:"Create your Artheon account"}}}} appearance={{variables:{colorPrimary:"#111e38",borderRadius:"0.5rem"}}}>{children}</ClerkProvider></body>
    </html>
  );
}
