// app/api/crm/address/[name]/route.ts
import { createGetHandler, createUpdateHandler, createDeleteHandler } from "@/lib/api-factory";

export const GET = createGetHandler("Address");
export const PUT = createUpdateHandler("Address");
export const DELETE = createDeleteHandler("Address");