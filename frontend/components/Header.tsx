"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import {
  CodeBracketIcon,
  MenuIcon,
  CloseIcon,
  DashboardIcon,
  PlusCircleIcon,
  LogoutIcon,
} from "./Icons";

export default function Header() {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg group-hover:scale-110 transition-transform duration-200">
              <CodeBracketIcon />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              DuBuddy
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 font-medium transition-colors"
                >
                  <DashboardIcon />
                  Dashboard
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/create-model"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 font-medium transition-colors"
                  >
                    <PlusCircleIcon />
                    Create Model
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 font-medium text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <LogoutIcon />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-2 font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col space-y-2">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <DashboardIcon />
                    Dashboard
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin/create-model"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <PlusCircleIcon />
                      Create Model
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left"
                  >
                    <LogoutIcon />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-center font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
