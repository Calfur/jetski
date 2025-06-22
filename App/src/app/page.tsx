import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-gray-900 dark:to-blue-900">
      <div className="max-w-4xl mx-auto text-center">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-4">
            Jetski
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 font-medium">
            Vibe Code Challenge For All - Online.ch Palermo
          </p>
        </div>

        {/* Cards Container */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Game View Card */}
          <Link href="/view" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                
                {/* Content */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Game View
                </h2>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-4">
                  View only
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  Open this on a big screen to display the map
                </p>
              </div>
            </div>
          </Link>

          {/* Controller View Card */}
          <Link href="/controller" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                
                {/* Content */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Controller View
                </h2>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-4">
                  Input only
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  Use this on your phone to control your jetski
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
