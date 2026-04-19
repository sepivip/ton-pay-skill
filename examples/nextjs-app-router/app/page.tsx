import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 480 }}>
      <h1>TON Pay Example — Next.js</h1>
      <p>Minimal reference integration of TON Pay in a Next.js App Router app.</p>
      <Link href="/checkout">Go to checkout →</Link>
    </main>
  );
}
