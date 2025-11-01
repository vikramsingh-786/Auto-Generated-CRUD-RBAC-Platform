"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { apiClient } from "../../../lib/apiClient";
import { toast } from "sonner";
import {
  PlusIcon,
  TrashIcon,
  DatabaseIcon,
  ShieldCheckIcon,
  ListIcon,
} from "../../../components/Icons";

interface FieldState {
  name: string;
  type: "string" | "number" | "boolean" | "relation";
  required: boolean;
  unique: boolean;
  default: string;
  targetModel?: string;
}

type Permission = "create" | "read" | "update" | "delete";
type Role = "Admin" | "Manager" | "Viewer";
type RbacState = Record<Role, Permission[]>;

const ALL_PERMISSIONS: Permission[] = ["create", "read", "update", "delete"];
const ALL_ROLES: Role[] = ["Admin", "Manager", "Viewer"];

export default function CreateModelPage() {
  const [existingModels, setExistingModels] = useState<string[]>([]);
  const { isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modelName, setModelName] = useState("");
  const [ownerField, setOwnerField] = useState("");

  const [fields, setFields] = useState<FieldState[]>([
    { name: "", type: "string", required: false, unique: false, default: "" },
  ]);

  const [rbac, setRbac] = useState<RbacState>({
    Admin: ["create", "read", "update", "delete"],
    Manager: ["create", "read", "update"],
    Viewer: ["read"],
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (!isAdmin) {
        toast.error("You do not have permission to access this page.");
        router.push("/admin/dashboard");
      } else {
        setIsLoading(false);

        const fetchModels = async () => {
          try {
            const models = await apiClient.get("/model-definitions/list");
            setExistingModels(models);
          } catch (error) {
            console.error("Could not fetch existing models:", error);
          }
        };

        fetchModels();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isAdmin, router]);

  const addField = () => {
    setFields([
      ...fields,
      { name: "", type: "string", required: false, unique: false, default: "" },
    ]);
  };

  const removeField = (index: number) => {
    if (fields.length > 1) {
      setFields(fields.filter((_, i) => i !== index));
    }
  };

  const handleFieldChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const newFields = [...fields];
    const { name, value, type, checked } = event.target as HTMLInputElement;

    if (name === "type") {
      (newFields[index] as any)[name] = value;
      if (value !== "relation") {
        delete newFields[index].targetModel;
      } else {
        newFields[index].default = ""; 
      }
    } else if (type === "checkbox") {
      (newFields[index] as any)[name] = checked;
    } else {
      (newFields[index] as any)[name] = value;
    }

    setFields(newFields);
  };

  const handleRbacChange = (
    role: Role,
    permission: Permission,
    checked: boolean
  ) => {
    setRbac((prevRbac) => {
      const currentPermissions = prevRbac[role] || [];
      if (checked)
        return {
          ...prevRbac,
          [role]: [...new Set([...currentPermissions, permission])],
        };
      else
        return {
          ...prevRbac,
          [role]: currentPermissions.filter((p) => p !== permission),
        };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const invalidRelations = fields.filter(
      (f) => f.type === "relation" && !f.targetModel
    );
    if (invalidRelations.length > 0) {
      toast.error("All 'relation' fields must have a target model selected.");
      setIsSubmitting(false);
      return;
    }

    const modelDefinition = {
      name: modelName.trim(),
      ownerField: ownerField.trim() || undefined,
      fields: fields
        .filter((f) => f.name.trim() !== "")
        .map((f) => {
          const trimmedName = f.name.trim();
          const trimmedDefault = f.default ? String(f.default).trim() : "";
          
          if (f.type === "relation") {
            return {
              name: trimmedName,
              type: f.type,
              required: f.required,
              unique: f.unique,
              targetModel: f.targetModel,
            };
          }
          return {
            ...f,
            name: trimmedName,
            default: trimmedDefault === "" ? undefined : f.default,
          };
        }),
      rbac: rbac,
    };

    if (!modelDefinition.name) {
      toast.error("Model Name cannot be empty.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await apiClient.post(
        "/model-definitions/publish",
        modelDefinition
      );
      toast.success(result.message || "Model published successfully!");
      router.push(`/admin/data/${modelDefinition.name}`);
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Create New Data Model
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Define your data structure with fields and permissions
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-inner">
                <DatabaseIcon className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Model Configuration
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Basic model settings
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="modelName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Model Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="modelName"
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g., Product, User, Order"
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                />
              </div>
              <div>
                <label
                  htmlFor="ownerField"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Owner Field Name{" "}
                  <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  id="ownerField"
                  type="text"
                  value={ownerField}
                  onChange={(e) => setOwnerField(e.target.value)}
                  placeholder="e.g., userId (must be a number field)"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Field that identifies the record owner
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fields Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-inner">
                  <ListIcon className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Fields
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {fields.length} field{fields.length !== 1 ? "s" : ""}{" "}
                    defined
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={addField}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                <PlusIcon className="w-5 h-5" />
                Add Field
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 dark:text-gray-400 pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="col-span-3">Field Name</span>
                <span className="col-span-2">Type</span>
                <span className="col-span-2">Default/Target</span>
                <span className="col-span-2 text-center">Required</span>
                <span className="col-span-2 text-center">Unique</span>
                <span className="col-span-1 text-center">Actions</span>
              </div>

              {fields.map((field, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  <div className="md:col-span-3">
                    <label className="block md:hidden text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Field Name
                    </label>
                    <input
                      name="name"
                      placeholder="e.g., title, price, isActive"
                      value={field.name}
                      onChange={(e) => handleFieldChange(index, e)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block md:hidden text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      name="type"
                      value={field.type}
                      onChange={(e) => handleFieldChange(index, e)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="relation">Relation</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    {field.type === "relation" ? (
                      <>
                        <label className="block md:hidden text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Target Model
                        </label>
                        <select
                          name="targetModel"
                          value={field.targetModel || ""}
                          onChange={(e) => handleFieldChange(index, e)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="" disabled>
                            Select model...
                          </option>
                          {existingModels
                            .filter(
                              (m) => m.toLowerCase() !== modelName.toLowerCase()
                            )
                            .map((model) => (
                              <option key={model} value={model}>
                                {model}
                              </option>
                            ))}
                        </select>
                      </>
                    ) : field.type === "boolean" ? (
                      <>
                        <label className="block md:hidden text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Default Value
                        </label>
                        <select
                          name="default"
                          value={field.default}
                          onChange={(e) => handleFieldChange(index, e)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">None</option>
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      </>
                    ) : (
                      <>
                        <label className="block md:hidden text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Default Value
                        </label>
                        <input
                          name="default"
                          placeholder="Optional"
                          value={field.default}
                          onChange={(e) => handleFieldChange(index, e)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </>
                    )}
                  </div>

                  <div className="md:col-span-2 flex items-center justify-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="required"
                        checked={field.required}
                        onChange={(e) => handleFieldChange(index, e)}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Required
                      </span>
                    </label>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="unique"
                        checked={field.unique}
                        onChange={(e) => handleFieldChange(index, e)}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Unique
                      </span>
                    </label>
                  </div>

                  <div className="md:col-span-1 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      disabled={fields.length === 1}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove field"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-inner">
                <ShieldCheckIcon className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Role Permissions
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configure access control for each role
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ALL_ROLES.map((role) => (
                <div
                  key={role}
                  className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-600"
                >
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        role === "Admin"
                          ? "bg-purple-500"
                          : role === "Manager"
                          ? "bg-blue-500"
                          : "bg-green-500"
                      }`}
                    ></div>
                    {role}
                  </h3>
                  <div className="space-y-3">
                    {ALL_PERMISSIONS.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={rbac[role]?.includes(permission)}
                          onChange={(e) =>
                            handleRbacChange(role, permission, e.target.checked)
                          }
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="capitalize text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {permission}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-8 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Publishing...
              </>
            ) : (
              <>
                <DatabaseIcon className="w-5 h-5" />
                Publish Model
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}