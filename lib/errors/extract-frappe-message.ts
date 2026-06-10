// lib/errors/extract-frappe-message.ts
// Obsidian ERP v4.0 — Normalises Frappe / frappe-js-sdk errors into a
// human-readable string.  The resolver (frappe-error-resolver.ts) calls
// this as its first step so strategies always match on clean text.
//
// G4: ALL return paths route through sanitizeResult() to guarantee
// [object Object] never reaches the user.

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

/**
 * G4: Single exit gate — every return from extractFrappeMessage passes
 * through this. Catches [object Object], "[object Object]", and any
 * stringified-object patterns.
 */
function sanitizeResult(raw: string): string {
  if (!raw) return "An unexpected error occurred";
  if (
    raw === "[object Object]" ||
    raw.includes("[object Object]") ||
    /^\{"[^"]+":\s*/.test(raw) // starts like JSON object
  ) {
    // Try to extract a readable message from the JSON
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        if (typeof parsed.message === "string") return stripHtml(parsed.message);
        if (typeof parsed.error === "string") return stripHtml(parsed.error);
        if (typeof parsed.exception === "string") return stripHtml(parsed.exception);
      }
    } catch {
      // not JSON — just the broken string
    }
    return "An unexpected error occurred";
  }
  return raw;
}

export function extractFrappeMessage(err: unknown): string {
  // 1. _server_messages  (JSON array of strings, each may be a JSON object with .message)
  if (isFrappeError(err) && typeof err._server_messages === "string") {
    try {
      const entries: unknown[] = JSON.parse(err._server_messages);
      const parts = entries.map((entry) => {
        if (typeof entry === "string") {
          try {
            const parsed = JSON.parse(entry);
            if (typeof parsed === "object" && parsed !== null && "message" in parsed) {
              const msg = parsed.message;
              return typeof msg === "string" ? stripHtml(msg) : String(msg);
            }
          } catch {
            // not JSON — treat as plain string
            return stripHtml(entry);
          }
          return stripHtml(entry);
        }
        if (typeof entry === "object" && entry !== null && "message" in entry) {
          const msg = (entry as { message: unknown }).message;
          return typeof msg === "string" ? stripHtml(msg) : String(msg);
        }
        return String(entry);
      });
      return sanitizeResult(parts.join(" · "));
    } catch {
      // malformed JSON — fall through
    }
  }

  // 2. exception — "ValidationError: Some human message" → take after last ":"
  if (isFrappeError(err) && typeof err.exception === "string" && err.exception) {
    const parts = err.exception.split(":");
    const humanMsg = parts.length > 1 ? parts.slice(-1)[0].trim() : err.exception.trim();
    if (humanMsg) return sanitizeResult(humanMsg);
  }

  // 3. message (string | object | array)
  if (isFrappeError(err) && err.message !== undefined && err.message !== null) {
    if (typeof err.message === "string" && err.message) {
      return sanitizeResult(err.message);
    }
    // object/array → stringify then sanitize
    return sanitizeResult(JSON.stringify(err.message));
  }

  // 4. httpStatus
  if (isFrappeError(err) && typeof err.httpStatus === "number") {
    return `The server rejected this action (${err.httpStatus}).`;
  }

  // 5. Standard Error fallback
  if (err instanceof Error && err.message) {
    return sanitizeResult(err.message);
  }

  // 6. Plain string
  if (typeof err === "string" && err) {
    return sanitizeResult(err);
  }

  // 7. Fallback
  return "An unexpected error occurred";
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

  // G4 fixture: _server_messages where entry.message is an object (the actual bug)
  serverMessagesObjectMessage: {
    _server_messages: JSON.stringify([
      JSON.stringify({ message: { code: "ERR_MANDATORY", field: "company" } }),
    ]),
  } as FrappeError,
};
