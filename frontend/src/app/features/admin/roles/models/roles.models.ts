export interface Permission {
  id: string;
  code: string;
  component: string;
  description: string | null;
}

export interface RoleSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  /** Presente en el detalle (`GET /roles/:id`). */
  permissionIds?: string[];
}

export interface CreateRolePayload {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
}
