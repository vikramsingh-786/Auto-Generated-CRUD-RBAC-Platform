"use client";

import { useEffect, useState, useMemo } from "react"; // ✅ Import useMemo
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../context/AuthContext";
import AddNewRecordForm from "../../../../components/AddNewRecordForm";
import { apiClient } from "../../../../lib/apiClient";
import { toast } from "sonner";
import {
  EditIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
  ListIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../../../../components/Icons";
import { ModelDefinition } from "../../../../components/types";

type Role = "Admin" | "Manager" | "Viewer";

export default function ModelDataPage() {
  const params = useParams();
  const router = useRouter();
  // ✅ Get the user's role and ID from the auth context
  const { isAuthenticated, role, userId } = useAuth();
  const modelName = params.modelName as string;
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modelDefinition, setModelDefinition] =
    useState<ModelDefinition | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<any>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // ✅ Calculate user's permissions once and memoize the result
  const userPermissions = useMemo(() => {
    if (!role || !modelDefinition?.rbac) return [];
    return modelDefinition.rbac[role as Role] || [];
  }, [role, modelDefinition]);

  const canCreate = userPermissions.includes('create') || userPermissions.includes('all');
  const canUpdate = userPermissions.includes('update') || userPermissions.includes('all');
  const canDelete = userPermissions.includes('delete') || userPermissions.includes('all');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to page 1 when search changes
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const fetchData = async () => {
    if (!modelName) return;
    setLoading(true);
    setError(null);
    try {
      const limit = 10;
      
      // ✅ Send search and pagination parameters to backend
      const result = await apiClient.get(
        `/api/${modelName}?page=${currentPage}&limit=${limit}&search=${debouncedSearchTerm}`
      );

      setRecords(result.data || []);
      setTotalRecords(result.total || 0);
      setTotalPages(Math.ceil((result.total || 0) / limit));
    } catch (err: any) {
      setError(err.message);
      if (err.message.includes("401") || err.message.includes("403")) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchDef = async () => {
      if (modelName) {
        try {
          const definition = await apiClient.get(
            `/model-definitions/${modelName}`
          );
          setModelDefinition(definition);
        } catch (err: any) {
          setError(err.message || "Could not load model definition.");
        }
      }
    };
    fetchDef();
  }, [modelName]);

  useEffect(() => {
    if (isAuthenticated && modelName) {
      fetchData();
    } else if (!isAuthenticated && modelName) {
      router.push("/login");
    }
  }, [modelName, isAuthenticated, router, currentPage, debouncedSearchTerm]);

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchData();
  };

  const handleDelete = async (recordId: number) => {
    toast("Are you sure you want to delete this record?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            setRecords((prevRecords) =>
              prevRecords.filter((r) => r.id !== recordId)
            );
            await apiClient.delete(`/api/${modelName}/${recordId}`);
            toast.success("Record deleted successfully!");
            fetchData();
          } catch (err: any) {
            fetchData();
          }
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
      duration: 5000,
    });
  };

  const handleEdit = (record: any) => {
    setEditingRecordId(record.id);
    setEditingData(record);
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setEditingData({});
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setEditingData((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveEdit = async (recordId: number) => {
    try {
      const { id, createdAt, updatedAt, ...updatePayload } = editingData;
      
      const updatedRecord = await apiClient.put(
        `/api/${modelName}/${recordId}`,
        updatePayload
      );
      
      toast.success("Record updated successfully!");

      setRecords((prevRecords) =>
        prevRecords.map((r) => {
          if (r.id === recordId) {
            return updatedRecord;
          }
          return r;
        })
      );
      
      setEditingRecordId(null);
      setEditingData({});
    } catch (err: any) {
      fetchData();
    }
  };

  const headers =
    modelDefinition && Array.isArray(modelDefinition.fields)
      ? [
          "id",
          ...modelDefinition.fields.map((f) => f.name),
          "createdAt",
          "updatedAt",
          "actions",
        ]
      : [];

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Error Loading Data
          </h2>
          <p className="text-red-600 dark:text-red-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!modelDefinition || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderCellContent = (record: any, header: string) => {
    const isEditingThisRow = editingRecordId === record.id;
    const fieldDef = modelDefinition?.fields.find((f) => f.name === header);

    // In-line editing
    if (isEditingThisRow && fieldDef) {
      if (fieldDef.type === "boolean") {
        return (
          <input
            type="checkbox"
            name={header}
            checked={!!editingData[header]}
            onChange={handleEditChange}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        );
      }
      if (fieldDef.type === "number" || fieldDef.type === "relation") {
        return (
          <input
            type="number"
            name={header}
            value={editingData[header] ?? ""}
            onChange={handleEditChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        );
      }
      if (fieldDef.type === "date") {
        return (
          <input
            type="datetime-local"
            name={header}
            value={
              editingData[header]
                ? new Date(editingData[header]).toISOString().slice(0, 16)
                : ""
            }
            onChange={handleEditChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        );
      }
      return (
        <input
          type="text"
          name={header}
          value={editingData[header] ?? ""}
          onChange={handleEditChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      );
    }

    // Read-only display
    const value = record[header];
    if (fieldDef?.type === "boolean") {
      return value ? (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
          <CheckIcon className="w-4 h-4" /> True
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-xs font-medium">
          <XIcon className="w-4 h-4" /> False
        </span>
      );
    }

    if (
      fieldDef?.type === "date" ||
      header === "createdAt" ||
      header === "updatedAt"
    ) {
      return value ? new Date(value).toLocaleString() : "N/A";
    }

    return String(value ?? "");
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white capitalize">
              {modelName} Data
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {totalRecords} {totalRecords === 1 ? "record" : "records"} found
            </p>
          </div>
          {/* ✅ Conditionally render the "Add New" button based on permissions */}
          {canCreate && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              {showForm ? (
                <>
                  <XIcon /> Cancel
                </>
              ) : (
                <>
                  <PlusIcon /> Add New {modelName}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Add New Record Form (conditionally rendered) */}
      {showForm && canCreate && (
        <div className="mb-8">
          <AddNewRecordForm
            modelDefinition={modelDefinition}
            onSuccess={handleFormSuccess}
          />
        </div>
      )}

      {/* Data Table & Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Search Input */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={`Search in ${modelName}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
              <ListIcon />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No records found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm
                ? `No results for "${searchTerm}"`
                : `Get started by adding your first ${modelName} record.`}
            </p>
            {!searchTerm && canCreate && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon />
                Add First Record
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700">
                  <tr>
                    {headers.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-6 py-4 font-semibold text-left text-gray-700 dark:text-gray-300 capitalize"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {records.map((record) => {
                    const isEditingThisRow = editingRecordId === record.id;
                     
                    const isOwner = modelDefinition.ownerField 
                      ? Number(record[modelDefinition.ownerField]) === userId 
                      : true;

                    return (
                      <tr
                        key={record.id}
                        className={`transition-colors ${
                          isEditingThisRow
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        }`}
                      >
                        {headers.map((header) => {
                          if (header === "actions") {
                            return (
                              <td key="actions" className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  {isEditingThisRow ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveEdit(record.id)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                                        title="Save changes"
                                      >
                                        <CheckIcon /> Save
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                        title="Cancel editing"
                                      >
                                        <XIcon /> Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {/* This conditional rendering is now correct */}
                                      {canUpdate && (role === 'Admin' || isOwner) && (
                                        <button
                                          onClick={() => handleEdit(record)}
                                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                          title="Edit record"
                                        >
                                          <EditIcon />
                                        </button>
                                      )}
                                      
                                      {/* This conditional rendering is now correct */}
                                      {canDelete && (role === 'Admin' || isOwner) && (
                                        <button
                                          onClick={() => handleDelete(record.id)}
                                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                          title="Delete record"
                                        >
                                          <TrashIcon />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={header}
                              className="px-6 py-4 text-gray-900 dark:text-gray-100"
                            >
                              {renderCellContent(record, header)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon />
                  Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}