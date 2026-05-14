import { type ReactNode } from "react";

const Footer = () => {
  return (
    <footer className="border-t py-6 text-center text-sm text-gray-500">
      <p>
        © {new Date().getFullYear()} Suat Sülün. All rights reserved.
      </p>
    </footer>
  );
};

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">

      <main className="flex-1">{children}</main>

      <Footer />
    </div>
  );
}
