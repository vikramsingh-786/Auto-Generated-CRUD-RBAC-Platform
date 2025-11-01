"use client";

import { useEffect, useState } from "react";
import { apiClient } from "../lib/apiClient";
import { ModelField, RecordBase } from "./types";

interface RelationInputProps {
  field: ModelField;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
}

export function RelationInput({
  field,
  value,
  onChange,
  disabled = false,
}: RelationInputProps) {
  const [relatedRecords, setRelatedRecords] = useState<RecordBase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelated = async () => {
      if (!field.targetModel) {
        setError("No target model specified");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const response = await apiClient.get(`/api/${field.targetModel}`);
      
        let records: any[] = [];
        if (Array.isArray(response)) {
          records = response;
        } else if (response && typeof response === 'object' && 'data' in response) {
          records = Array.isArray(response.data) ? response.data : [];
        }
        
        setRelatedRecords(records);
      } catch (err: any) {
        console.error(`Failed to fetch ${field.targetModel}:`, err);
        setError(`Could not load ${field.targetModel} options`);
        setRelatedRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRelated();
  }, [field.targetModel]);

  if (isLoading) {
    return (
      <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Loading options...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 py-3 border border-red-300 dark:border-red-600 rounded-lg bg-red-50 dark:bg-red-900/20">
        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
      </div>
    );
  }

  const getDisplayText = (record: any): string => {
    if (record.name) return record.name;
    if (record.title) return record.title;
    if (record.label) return record.label;
    if (record.description) return record.description;
    if (record.email) return record.email;
    if (record.username) return record.username;

    return `ID: ${record.id}`;
  };

  return (
    <select
      name={field.name}
      value={value || ""}
      onChange={onChange}
      disabled={disabled}
      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="">
        Select {field.targetModel || "option"}...
      </option>
      {relatedRecords.map((record) => (
        <option key={record.id} value={record.id}>
          {getDisplayText(record)} (ID: {record.id})
        </option>
      ))}
      {relatedRecords.length === 0 && (
        <option value="" disabled>
          No {field.targetModel} records available
        </option>
      )}
    </select>
  );
}