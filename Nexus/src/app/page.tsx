import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <h1>Nexus</h1>
      <p>Agentic automation hub</p>
      <p>
        <Link href="/login">Dashboard login</Link>
        {" · "}
        <Link href="/dashboard">Runs</Link> (requires session)
      </p>
    </main>
  );
}
