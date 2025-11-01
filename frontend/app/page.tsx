// frontend/app/page.tsx
"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { CodeBracketIcon } from "../components/Icons";

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] px-4 text-center">
      <div className="max-w-4xl mx-auto">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl mb-8 shadow-lg">
          <CodeBracketIcon />
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
          Welcome to the{" "}
          <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
            DuBuddy Developer Platform
          </span>
        </h1>

        <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 dark:text-gray-400">
          Build your backend in minutes, not weeks.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          {isAuthenticated ? (
            <Link
              href="/admin/dashboard" 
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              Go to Your Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-blue-700 bg-blue-100 rounded-xl hover:bg-blue-200 dark:text-blue-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
