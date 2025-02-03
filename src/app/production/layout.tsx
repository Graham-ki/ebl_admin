// app/production/layout.tsx
import Header from '@/app/production/components/header';
import Footer from '@/app/production/components/footer';
import './production.css'; // Import the CSS file

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="production-layout">
      <Header />
      <main>{children}</main> {/* This will render the page content */}
      <Footer />
    </div>
  );
}
