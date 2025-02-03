// app/production/components/Header.tsx
import Link from 'next/link';

export default function Header() {
  return (
    <header className="header">
      <nav>
        <ul>
          <li><Link href="/production">Dashboard</Link></li>
          <li><Link href="/production/products">Products</Link></li>
          <li><Link href="/production/categories">Categories</Link></li>
          <li><Link href="/production/materials">Materials</Link></li>
        </ul>
      </nav>
    </header>
  );
}
