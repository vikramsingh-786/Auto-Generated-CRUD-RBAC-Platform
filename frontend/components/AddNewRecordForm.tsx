"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext"; 
import { apiClient } from "@/lib/apiClient"; 
import { toast } from "sonner";
import { RelationInput } from "@/components/RelationInput"; 
import { ModelDefinition, convertFieldValue } from "@/components/types";
import { PlusCircleIcon, XMarkIcon, LinkIcon } from "@/components/Icons"; 

interface AddNewRecordFormProps {
  modelDefinition: ModelDefinition | null;
  onSuccess: () => void;
}

export default function AddNewRecordForm({
  modelDefinition,
  onSuccess,
}: AddNewRecordFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (modelDefinition && modelDefinition.fields) {
      const initialState = modelDefinition.fields
        .filter(field => field.name !== modelDefinition.ownerField) 
        .reduce((acc, field) => {
        if (field.type === "boolean") {
          acc[field.name] = false;
        } else if (field.type === "relation") {
          acc[field.name] = ""; 
        } else {
          acc[field.name] = "";
        }
        return acc;
      }, {} as Record<string, any>);
      setFormData(initialState);
    }
  }, [modelDefinition]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
          ? value === ""
            ? "" 
            : value 
          : type === "select-one" && value === ""
          ? "" 
          : type === "select-one"
          ? value 
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!modelDefinition) {
      setError("Model definition is not available.");
      setIsSubmitting(false);
      return;
    }

    try {
      const submitData: Record<string, any> = {};

      modelDefinition.fields
        .filter(field => field.name !== modelDefinition.ownerField) 
        .forEach((field) => {
        const value = formData[field.name];
        if (field.type === "relation" && (value === "" || value === null || value === undefined)) {
          return;
        }

        if (!field.required && (value === null || value === undefined)) {
          return;
        }
        
        if (!field.required && (field.type === "number" || field.type === "relation") && value === "") {
          return;
        }

        try {
          const convertedValue = convertFieldValue(value, field.type);
          if (convertedValue !== undefined) {
            submitData[field.name] = convertedValue;
          }
        } catch (conversionError: any) {
          throw new Error(
            `Invalid value for ${field.name}: ${conversionError.message}`
          );
        }
      });

      console.log("Submitting data:", submitData);

      await apiClient.post(`/api/${modelDefinition.name}`, submitData);
      toast.success(`${modelDefinition.name} record created successfully!`);


      const initialState = modelDefinition.fields
        .filter(field => field.name !== modelDefinition.ownerField) // <-- Reset without owner field
        .reduce((acc, field) => {
        if (field.type === "boolean") {
          acc[field.name] = false;
        } else if (field.type === "relation") {
          acc[field.name] = "";
        } else {
          acc[field.name] = "";
        }
        return acc;
      }, {} as Record<string, any>);
      setFormData(initialState);

      onSuccess();
    } catch (err: any) {
      const errorMessage = err.message || "Failed to create record";
      setError(errorMessage);
      
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    if (modelDefinition) {
      const initialState = modelDefinition.fields
        .filter(field => field.name !== modelDefinition.ownerField) 
        .reduce((acc, field) => {
        if (field.type === "boolean") {
          acc[field.name] = false;
        } else if (field.type === "relation") {
          acc[field.name] = "";
        } else {
          acc[field.name] = "";
        }
        return acc;
      }, {} as Record<string, any>);
      setFormData(initialState);
      setError(null);
    }
  };

  if (!modelDefinition || !Array.isArray(modelDefinition.fields)) {
    return (
      <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading form...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
            <PlusCircleIcon />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Add New {modelDefinition.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fill in the details to create a new record
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="text-red-600 dark:text-red-400">
                <XMarkIcon />
              </div>
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {modelDefinition.fields
            .filter(field => field.name !== modelDefinition.ownerField) 
            .map((field) => (
            <div
              key={field.name}
              className={field.type === "relation" ? "col-span-full" : ""}
            >
              <label
                htmlFor={field.name}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize"
              >
                <div className="flex items-center gap-2">
                  {field.type === "relation" && <LinkIcon />}
                  <span>{field.name}</span>
                  {field.required && <span className="text-red-500">*</span>}
                  <span className="ml-1 text-gray-400 text-xs font-normal">
                    (
                    {field.type === "relation"
                      ? `→ ${field.targetModel}`
                      : field.type}
                    )
                  </span>
                </div>
              </label>

              {field.type === "boolean" ? (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id={field.name}
                    name={field.name}
                    checked={!!formData[field.name]}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formData[field.name] ? "True" : "False"}
                  </span>
                </label>
              ) : field.type === "relation" ? (
                <RelationInput
                  field={field}
                  value={formData[field.name] ?? ""}
                  onChange={handleChange}
                />
              ) : (
                <input
                  type={field.type === "number" ? "number" : "text"}
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] ?? ""}
                  onChange={handleChange}
                  placeholder={`Enter ${field.name}`}
                  required={field.required}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  step={field.type === "number" ? "any" : undefined} // Allow decimals
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <PlusCircleIcon />
                Create Record
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}