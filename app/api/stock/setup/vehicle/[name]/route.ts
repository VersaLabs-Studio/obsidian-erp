// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { VehicleUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Vehicle");
export const PUT = createUpdateHandler("Vehicle", VehicleUpdateSchema);
export const DELETE = createDeleteHandler("Vehicle");
