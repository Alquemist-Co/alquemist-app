export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center gap-6 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-card bg-brand">
          <span className="text-2xl font-bold text-white">A</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-brand">
          Alquemist
        </h1>
        <p className="max-w-md text-lg text-text-secondary">
          Sistema de gestion agricola integral
        </p>
        <div className="mt-4 rounded-badge bg-brand-light px-4 py-2 text-sm font-medium text-brand-dark">
          Setup completo — listo para desarrollar
        </div>
      </main>
    </div>
  );
}
