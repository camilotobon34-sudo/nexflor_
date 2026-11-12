import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asistencia digital | Viviana Mambuscay",
  description: "Acceso al sistema de asistencia para capacitaciones y entrenamientos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
