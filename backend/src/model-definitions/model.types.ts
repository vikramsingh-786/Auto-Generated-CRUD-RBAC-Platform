
export type RbacPermissions = 'all' | 'create' | 'read' | 'update' | 'delete';
export type FieldType = 'string' | 'number' | 'boolean' | 'relation' | 'date';
export type RbacPolicy = {
  [role: string]: RbacPermissions[];
};


export interface FieldDefinition {
name: string;
type: FieldType;
required?: boolean;
unique?: boolean;
default?: any;
targetModel?: string;
}
export interface ModelField {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "relation";
  required?: boolean;
  unique?: boolean;
  default?: any;
  targetModel?: string; 
}
export interface ModelDefinition {
  name: string;
  tableName?: string;
  ownerField?: string;
  fields: ModelField[]; 
  rbac?: RbacPolicy;   
}
export interface DbColumnInfo {
column_name: string;
data_type: string;
is_nullable: string;
column_default: string | null;
}

export const convertFieldValue = (value: any, type: string) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  switch (type) {
    case "number":
    case "relation":
      const num = Number(value);
      if (isNaN(num)) throw new Error("must be a number");
      return num;
    case "boolean":
      return String(value).toLowerCase() === 'true';
    default:
      return String(value);
  }
};