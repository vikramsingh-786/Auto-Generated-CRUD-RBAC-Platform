"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "../../../context/AuthContext";
import { apiClient } from "../../../lib/apiClient";
import {
  DatabaseIcon,
  PlusIcon,
  ArrowRightIcon,
} from "../../../components/Icons"; 

export default function DashboardPage() {
  const [models, setModels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const fetchModels = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get("/model-definitions/list");
        setModels(data);
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message || "Failed to fetch models.");
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage your data models and records
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/admin/create-model"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              <PlusIcon />
              Create New Model
            </Link>
          )}
        </div>
      </div>

      {/* Models Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Available Models
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {models.length} {models.length === 1 ? "model" : "models"} configured
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : models.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((modelName) => (
                <Link
                  key={modelName}
                  href={`/admin/data/${modelName}`}
                  className="group relative p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                        <DatabaseIcon />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white capitalize group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {modelName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          Data Model
                        </p>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRightIcon />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                <DatabaseIcon />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No models yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {isAdmin
                  ? "Get started by creating your first data model. Click the button above to begin."
                  : "An admin hasn't created any models yet. Check back later."}
              </p>
              {isAdmin && (
                <Link
                  href="/admin/create-model"
                  className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon />
                  Create Your First Model
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
