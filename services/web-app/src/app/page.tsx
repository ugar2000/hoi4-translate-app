import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="w-full max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Paradox Game Translator
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Professional translation tool for Paradox Interactive games. 
            Translate your mods and game files with precision and ease.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20 hover:bg-white/15 transition duration-300">
            <h3 className="text-2xl font-semibold text-white mb-4 flex items-center">
              <span className="text-3xl mr-3">🎮</span>
              Game Support
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Support for Hearts of Iron IV, Europa Universalis IV, Crusader Kings III, and more Paradox games.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20 hover:bg-white/15 transition duration-300">
            <h3 className="text-2xl font-semibold text-white mb-4 flex items-center">
              <span className="text-3xl mr-3">🔧</span>
              Advanced Features
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Variable preservation, context-aware translation, and batch processing capabilities.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20 hover:bg-white/15 transition duration-300">
            <h3 className="text-2xl font-semibold text-white mb-4 flex items-center">
              <span className="text-3xl mr-3">🌐</span>
              Multiple Languages
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Translate to dozens of languages with professional-grade translation services.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20 hover:bg-white/15 transition duration-300">
            <h3 className="text-2xl font-semibold text-white mb-4 flex items-center">
              <span className="text-3xl mr-3">⚡</span>
              Fast & Reliable
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Process large files quickly with our optimized translation pipeline.
            </p>
          </div>
        </div>

        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Link 
              href="/login" 
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl transition duration-200 transform hover:scale-105 shadow-lg"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="w-full sm:w-auto bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-xl transition duration-200 transform hover:scale-105 border border-white/20"
            >
              Register
            </Link>
          </div>
          <p className="text-sm text-gray-400">
            Already have an account? <Link href="/translator" className="text-blue-400 hover:text-blue-300 hover:underline transition duration-200">Go to Translator</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
