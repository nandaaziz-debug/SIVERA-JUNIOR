import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIVERA Junior",
  description: "Alat bantu verifikasi klaim BPJS — RS ASM & RS Haryanda",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
