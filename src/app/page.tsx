export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">GershonCRM</h1>
        <p className="text-gray-400 mb-8">Task Manager</p>
        <a
          href="/api/auth/linkedin/login"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition"
        >
          Sign in with LinkedIn
        </a>
      </div>
    </main>
  )
}
