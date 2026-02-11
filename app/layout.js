import "./globals.css";

export const metadata = {
  title: "TERMINUS — Command Center Blog",
  description: "The blog that feels like a command center. A thinking machine for publishing.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
