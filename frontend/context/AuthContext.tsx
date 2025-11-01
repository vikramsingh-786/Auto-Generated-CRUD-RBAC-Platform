"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { apiClient } from "../lib/apiClient";
import { toast } from "sonner";

interface DecodedToken {
  email: string;
  role: string;
  sub: number; 
}

interface AuthContextType {
  token: string | null;
  role: string | null;
  userId: number | null; 
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      try {
        const decoded = jwtDecode<DecodedToken>(storedToken);
        setToken(storedToken);
        setRole(decoded.role);
        setUserId(decoded.sub);
      } catch (error) {
        console.error("Invalid token on load:", error);
        localStorage.removeItem("authToken");
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await apiClient.post("/auth/login", { email, password });
      const newToken = data.access_token;

      const decoded = jwtDecode<DecodedToken>(newToken);
      setToken(newToken);
      setRole(decoded.role);
      setUserId(decoded.sub);

      localStorage.setItem("authToken", newToken);

      toast.success("Login successful! Welcome back.");
      router.push("/admin/dashboard");
    } catch (error: any) {
      console.error("Login Error:", error);
      toast.error(error.message || "Login failed. Please check your credentials.");
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      await apiClient.post("/auth/register", { email, password });
      toast.success("Registration successful! Please log in.");
      router.push("/login");
    } catch (error: any) {
      console.error("Registration Error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setUserId(null);
    localStorage.removeItem("authToken");
    toast.info("You have been logged out.");
    router.push("/login");
  };

  const value: AuthContextType = {
    token,
    role,
    userId,
    login,
    register,
    logout,
    isAuthenticated: !!token,
    isAdmin: role?.toLowerCase() === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
