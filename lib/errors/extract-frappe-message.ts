// lib/errors/extract-frappe-message.ts
// Obsidian ERP v4.0 — Normalises Frappe / frappe-js-sdk errors into a
// human-readable string.  The resolver (frappe-error-resolver.ts) calls
// this as its first step so strategies always match on clean text.

interface FrappeError {
  _server_messages?: string;
  exception?: string;
  message?: string | object | unknown[];
  httpStatus?: number;
  httpStatusText?: string;
}

function isFrappeError(err: unknown): err is FrappeError {
  if (typeof err !== "object" || err === null) return false;
  return (
    "_server_messages" in err ||
    "exception" in err ||
    "message" in err ||
    "httpStatus" in err
  );
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

export function extractFrappeMessage(err: unknown): string {
  let result: string;

  // 1. _server_messages  (JSON array of strings, each may be a JSON object with .message)
  if (isFrappeError(err) && typeof err._server_messages === "string") {
    try {
      const entries: unknown[] = JSON.parse(err._server_messages);
      const parts = entries.map((entry) => {
        if (typeof entry === "string") {
          try {
            const parsed = JSON.parse(entry);
            if (typeof parsed === "object" && parsed !== null && "message" in parsed) {
              return String(parsed.message);
            }
          } catch {
            // not JSON — treat as plain string
            return stripHtml(entry);
          }
          return stripHtml(entry);
        }
        if (typeof entry === "object" && entry !== null && "message" in entry) {
          return String((entry as { message: unknown }).message);
        }
        return String(entry);
      });
      result = parts.join(" · ");
    } catch {
      // malformed JSON — fall through
      result = "";
    }

    if (result) return result;
  }

  // 2. exception — "ValidationError: Some human message" → take after last ":"
  if (isFrappeError(err) && typeof err.exception === "string" && err.exception) {
    const parts = err.exception.split(":");
    const humanMsg = parts.length > 1 ? parts.slice(-1)[0].trim() : err.exception.trim();
    if (humanMsg) return humanMsg;
  }

  // 3. message (string | object | array)
  if (isFrappeError(err) && err.message !== undefined && err.message !== null) {
    if (typeof err.message === "string" && err.message) {
      return err.message;
    }
    // object/array → stringify as last resort (but guard against [object Object] later)
    return JSON.stringify(err.message);
  }

  // 4. httpStatus
  if (isFrappeError(err) && typeof err.httpStatus === "number") {
    return `The server rejected this action (${err.httpStatus}).`;
  }

  // 5. Standard Error fallback
  if (err instanceof Error && err.message) {
    return err.message;
  }

  // 6. Plain string
  if (typeof err === "string" && err) {
    return err;
  }

  // 7. Fallback
  result = "An unexpected error occurred";

  // Guard: NEVER return [object Object]
  if (result.includes("[object Object]")) {
    result = "An unexpected error occurred";
  }

  return result;
}

// ---------------------------------------------------------------------------
// Test fixtures — realistic frappe-js-sdk error shapes
// ---------------------------------------------------------------------------
export const KNOWN_FRAPPE_ERROR_FIXTURES = {
  serverMessages: {
    _server_messages: JSON.stringify([
      JSON.stringify({ message: "Email Address must be unique", indicator: "red" }),
      JSON.stringify({ message: "It is already used in CRM-LEAD-2026-00001" }),
    ]),
  } as FrappeError,

  serverMessagesHtml: {
    _server_messages: JSON.stringify([
      '<div class="ql-editor data-markdown" style="white-space: normal;"><p>Not enough units in warehouse</p></div>',
    ]),
  } as FrappeError,

  exceptionValidationError: {
    exception: "ValidationError: Email Address must be unique",
    httpStatus: 417,
  } as FrappeError,

  exceptionLinkExists: {
    exception: "LinkExistsError: Cannot delete because linked with submitted Sales Invoice",
    httpStatus: 417,
  } as FrappeError,

  messageString: {
    message: "Could not find Customer: CUST-999",
    httpStatus: 404,
  } as FrappeError,

  messageObject: {
    message: { error: "Something broke", details: [1, 2] },
    httpStatus: 500,
  } as FrappeError,

  httpOnly: {
    httpStatus: 503,
    httpStatusText: "Service Unavailable",
  } as FrappeError,

  bareError: new Error("1.0 units of Item P-001 needed in Warehouse Stores"),

  plainString: "Field customer is mandatory",

  emptyObject: {} as unknown,
};
