"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import {
  EnvelopeIcon,
  LockIcon,
  CodeBracketIcon,
  CheckIcon,
  ArrowRightIcon,
  ExclamationCircleIcon,
} from "../../components/Icons";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      const msg = "Email and password are required.";
      toast.error(msg); 
      setError(msg);
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password);
      setSuccess("Registration successful! Redirecting to login...");
    } catch (err: any) {
      const errorMessage = err.message || "Registration failed.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-3">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl mb-2.5 shadow-lg">
            <CodeBracketIcon />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Create Account
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Join the platform today
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <EnvelopeIcon />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all placeholder:text-gray-400 text-sm"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <LockIcon />
                  </div>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all placeholder:text-gray-400 text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-shake">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 text-red-500">
                      <ExclamationCircleIcon />
                    </div>
                    <p className="text-xs text-red-800 dark:text-red-200 font-medium">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 text-green-500">
                      <CheckIcon />
                    </div>
                    <p className="text-xs text-green-800 dark:text-green-200 font-medium">
                      {success}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !!success}
                className="w-full group relative py-2.5 px-4 font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden text-sm"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRightIcon />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>


      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
}