import { createCrudHandlers } from "@/lib/api-factory";

const { getHandler, updateHandler, deleteHandler } =
  createCrudHandlers("Fiscal Year");

export const GET = getHandler;
export const PUT = updateHandler;
export const DELETE = deleteHandler;
