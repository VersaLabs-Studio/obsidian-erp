// lib/api-factory.ts
// Obsidian ERP v4.0 - API Route Handler Factory
//
// 2P-FINAL Part A.2 — SHIP-GATE RBAC ENFORCEMENT.
//
// Every CRUD handler now resolves a per-request, user-scoped Frappe
// client via `getRequestClient(request)` (which forwards the `sid`
// cookie — see `lib/auth/resolve-user.ts` A.1). ERPNext then runs its
// native DocPerm engine for the requesting user. We do NOT re-
// implement permissions — we stop suppressing Frappe's.
//
// Fail-closed: no session → 401 (not a service-account 200, which
// is what happened before — every read/write ran as Administrator).
//
// The factory still uses `frappeClient.handleError` for error
// shaping (it's stateless — fine to keep importing the singleton
// just for that helper). Frappe returns 403 (PermissionError) for
// out-of-role access; `handleError` already maps that to a clean 403
// shape (`lib/frappe-client.ts:112`).
//
// The five handlers (createListHandler, createGetHandler,
// createCreateHandler, createUpdateHandler, createDeleteHandler)
// all already receive `request: NextRequest` as their first arg
// (this file, lines 58, 147, 194, 247, 327) — no route signature
// changes are needed at the consumer.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "./frappe-client";
import { getRequestClient } from "./auth/resolve-user";
import { ZodSchema, ZodError } from "zod";

/**
 * Standard API Response Types
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details: string | Record<string, string[]>;
  statusCode?: number;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Options for list handler
 */
interface ListHandlerOptions {
  /** Fields allowed in response (security whitelist) */
  allowedFields?: string[];
  /** Default filters always applied */
  defaultFilters?: [string, string, unknown][];
  /** Default sort order */
  defaultSort?: { field: string; order: "asc" | "desc" };
  /** Default limit */
  defaultLimit?: number;
  /** Maximum limit allowed */
  maxLimit?: number;
}

/**
 * Creates a GET handler for listing documents
 *
 * @example
 * ```ts
 * // app/api/stock/item/route.ts
 * export const GET = createListHandler("Item", {
 *   allowedFields: ["name", "item_code", "item_name", "item_group"],
 *   defaultSort: { field: "creation", order: "desc" },
 * });
 * ```
 */
export function createListHandler(
  doctype: string,
  options?: ListHandlerOptions,
) {
  return async function GET(request: NextRequest) {
    // 2P-FINAL Part A.2 — per-request user-scoped Frappe client.
    // Fail closed (401) when no session is present.
    const client = getRequestClient(request);
    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "No valid session.",
          statusCode: 401,
        },
        { status: 401 },
      );
    }
    try {
      const { searchParams } = new URL(request.url);

      // Parse query parameters
      let fields: string[] | undefined;
      if (searchParams.get("fields")) {
        fields = JSON.parse(searchParams.get("fields")!);
        // Security: filter to allowed fields if specified
        if (options?.allowedFields && fields) {
          fields = fields.filter((f) => options.allowedFields!.includes(f));
        }
      } else {
        fields = options?.allowedFields;
      }

      // Parse filters
      let filters: [string, string, unknown][] = options?.defaultFilters || [];
      if (searchParams.get("filters")) {
        const requestFilters = JSON.parse(searchParams.get("filters")!);
        filters = [...filters, ...requestFilters];
      }

      // Handle search parameter
      if (searchParams.get("search")) {
        const search = searchParams.get("search")!;
        // Add name-based search filter
        filters.push(["name", "like", `%${search}%`]);
      }

      // Parse sorting
      let orderBy = options?.defaultSort || {
        field: "creation",
        order: "desc" as const,
      };
      if (searchParams.get("order_by")) {
        const orderByStr = searchParams.get("order_by")!;
        const lastSpaceIndex = orderByStr.lastIndexOf(" ");
        if (lastSpaceIndex !== -1) {
          const field = orderByStr.substring(0, lastSpaceIndex);
          const order = orderByStr.substring(lastSpaceIndex + 1);
          orderBy = { field, order: order as "asc" | "desc" };
        } else {
          orderBy = { field: orderByStr, order: "asc" };
        }
      }

      // Parse pagination
      const limit = Math.min(
        parseInt(
          searchParams.get("limit") || String(options?.defaultLimit || 100),
        ),
        options?.maxLimit || 500,
      );
      const offset = parseInt(searchParams.get("offset") || "0");

      // Fetch from Frappe via the USER-scoped client (A.2). Frappe
      // runs DocPerm for the requesting user. A 403 PermissionError
      // becomes a clean 403 via handleError.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await client.db.getDocList(doctype, {
        fields: fields || ["*"],
        filters: filters as any, // Dynamic filters need type bypass
        orderBy,
        limit,
        start: offset,
      } as any);

      return NextResponse.json({
        success: true,
        data,
      });
    } catch (error) {
      const errorResponse = frappeClient.handleError(error);
      return NextResponse.json(errorResponse, {
        status: errorResponse.statusCode || 500,
      });
    }
  };
}

/**
 * Creates a GET handler for fetching a single document
 *
 * @example
 * ```ts
 * // app/api/stock/item/[name]/route.ts
 * export const GET = createGetHandler("Item");
 * ```
 */
export function createGetHandler(doctype: string) {
  return async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> },
  ) {
    // 2P-FINAL Part A.2 — per-request user-scoped Frappe client.
    const client = getRequestClient(request);
    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "No valid session.",
          statusCode: 401,
        },
        { status: 401 },
      );
    }
    try {
      const { name } = await params;

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing Parameter",
            details: "Document name is required",
          },
          { status: 400 },
        );
      }

      const data = await client.db.getDoc(
        doctype,
        decodeURIComponent(name),
      );

      return NextResponse.json({
        success: true,
        data,
      });
    } catch (error) {
      const errorResponse = frappeClient.handleError(error);
      return NextResponse.json(errorResponse, {
        status: errorResponse.statusCode || 500,
      });
    }
  };
}

/**
 * Creates a POST handler for creating documents
 *
 * @example
 * ```ts
 * // app/api/stock/item/route.ts
 * import { ItemCreateSchema } from "@/lib/schemas/doctype-schemas";
 * export const POST = createCreateHandler("Item", ItemCreateSchema);
 * ```
 */
export function createCreateHandler<T>(doctype: string, schema?: ZodSchema<T>) {
  return async function POST(request: NextRequest) {
    // 2P-FINAL Part A.2 — per-request user-scoped Frappe client.
    const client = getRequestClient(request);
    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "No valid session.",
          statusCode: 401,
        },
        { status: 401 },
      );
    }
    try {
      const body = await request.json();

      // Validate with Zod if schema provided
      if (schema) {
        try {
          schema.parse(body);
        } catch (e) {
          if (e instanceof ZodError) {
            return NextResponse.json(
              {
                success: false,
                error: "Validation Error",
                details: e.flatten().fieldErrors,
              },
              { status: 400 },
            );
          }
          throw e;
        }
      }

      const data = await client.db.createDoc(doctype, body);

      return NextResponse.json(
        {
          success: true,
          data,
          message: `${doctype} created successfully`,
        },
        { status: 201 },
      );
    } catch (error) {
      const errorResponse = frappeClient.handleError(error);
      return NextResponse.json(errorResponse, {
        status: errorResponse.statusCode || 500,
      });
    }
  };
}

/**
 * Creates a PUT handler for updating documents
 *
 * @example
 * ```ts
 * // app/api/stock/item/[name]/route.ts
 * import { ItemUpdateSchema } from "@/lib/schemas/doctype-schemas";
 * export const PUT = createUpdateHandler("Item", ItemUpdateSchema);
 * ```
 */
export function createUpdateHandler<T>(doctype: string, schema?: ZodSchema<T>) {
  return async function PUT(
    request: NextRequest,
    context?: { params: Promise<{ name: string }> },
  ) {
    // 2P-FINAL Part A.2 — per-request user-scoped Frappe client.
    const client = getRequestClient(request);
    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "No valid session.",
          statusCode: 401,
        },
        { status: 401 },
      );
    }
    try {
      // Get name from route params or query string
      let name: string | null = null;

      if (context?.params) {
        const params = await context.params;
        name = params.name;
      }

      if (!name) {
        const { searchParams } = new URL(request.url);
        name = searchParams.get("name");
      }

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing Parameter",
            details: "Document name is required",
          },
          { status: 400 },
        );
      }

      const body = await request.json();

      // Validate with Zod if schema provided
      if (schema) {
        try {
          schema.parse(body);
        } catch (e) {
          if (e instanceof ZodError) {
            return NextResponse.json(
              {
                success: false,
                error: "Validation Error",
                details: e.flatten().fieldErrors,
              },
              { status: 400 },
            );
          }
          throw e;
        }
      }

      const data = await client.db.updateDoc(
        doctype,
        decodeURIComponent(name),
        body,
      );

      return NextResponse.json({
        success: true,
        data,
        message: `${doctype} updated successfully`,
      });
    } catch (error) {
      const errorResponse = frappeClient.handleError(error);
      return NextResponse.json(errorResponse, {
        status: errorResponse.statusCode || 500,
      });
    }
  };
}

/**
 * Creates a DELETE handler for deleting documents
 *
 * @example
 * ```ts
 * // app/api/stock/item/[name]/route.ts
 * export const DELETE = createDeleteHandler("Item");
 * ```
 */
export function createDeleteHandler(doctype: string) {
  return async function DELETE(
    request: NextRequest,
    context?: { params: Promise<{ name: string }> },
  ) {
    // 2P-FINAL Part A.2 — per-request user-scoped Frappe client.
    const client = getRequestClient(request);
    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "No valid session.",
          statusCode: 401,
        },
        { status: 401 },
      );
    }
    try {
      // Get name from route params or query string
      let name: string | null = null;

      if (context?.params) {
        const params = await context.params;
        name = params.name;
      }

      if (!name) {
        const { searchParams } = new URL(request.url);
        name = searchParams.get("name");
      }

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing Parameter",
            details: "Document name is required",
          },
          { status: 400 },
        );
      }

      await client.db.deleteDoc(doctype, decodeURIComponent(name));

      return NextResponse.json({
        success: true,
        message: `${doctype} deleted successfully`,
      });
    } catch (error) {
      const errorResponse = frappeClient.handleError(error);
      return NextResponse.json(errorResponse, {
        status: errorResponse.statusCode || 500,
      });
    }
  };
}

/**
 * Creates all standard CRUD handlers for a doctype
 *
 * @example
 * ```ts
 * const { listHandler, getHandler, createHandler, updateHandler, deleteHandler } =
 *   createCrudHandlers("Item", {
 *     createSchema: ItemCreateSchema,
 *     updateSchema: ItemUpdateSchema,
 *     listOptions: { allowedFields: ["name", "item_code"] },
 *   });
 * ```
 */
export function createCrudHandlers<TCreate = unknown, TUpdate = unknown>(
  doctype: string,
  options?: {
    createSchema?: ZodSchema<TCreate>;
    updateSchema?: ZodSchema<TUpdate>;
    listOptions?: ListHandlerOptions;
  },
) {
  return {
    listHandler: createListHandler(doctype, options?.listOptions),
    getHandler: createGetHandler(doctype),
    createHandler: createCreateHandler(doctype, options?.createSchema),
    updateHandler: createUpdateHandler(doctype, options?.updateSchema),
    deleteHandler: createDeleteHandler(doctype),
  };
}
