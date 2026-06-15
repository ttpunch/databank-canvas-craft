import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_ROWS = 5000;
const MAX_COLUMNS = 50;

const RESERVED_COLUMNS: Record<string, string> = {
  id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
  quantity: "integer",
  stock_quantity: "integer",
  min_stock_level: "integer",
  usage_count: "integer",
  lead_time: "integer",
  unit_cost: "numeric",
  last_replaced_date: "timestamp with time zone DEFAULT now()",
  last_used_at: "timestamp with time zone DEFAULT now()",
  created_at: "timestamp with time zone DEFAULT now()",
  updated_at: "timestamp with time zone DEFAULT now()",
};

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function sanitizeIdentifier(raw: string, fallbackPrefix: string, index: number): string {
  let sanitized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!sanitized || !/^[a-z]/.test(sanitized)) {
    sanitized = `${fallbackPrefix}_${index}${sanitized ? `_${sanitized}` : ""}`;
  }

  sanitized = sanitized.slice(0, 63);

  if (!IDENTIFIER_PATTERN.test(sanitized)) {
    sanitized = `${fallbackPrefix}_${index}`;
  }

  return sanitized;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  // Require an authenticated user. The anon key alone is not sufficient.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonResponse({ error: "Missing or invalid Authorization header." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Verify the caller's JWT against the anon-key client before doing anything privileged.
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  try {
    const { sheetDisplayName, jsonData } = await req.json();

    if (
      typeof sheetDisplayName !== "string" ||
      !sheetDisplayName.trim() ||
      !Array.isArray(jsonData) ||
      jsonData.length === 0
    ) {
      return jsonResponse(
        { error: "Invalid input: sheetDisplayName and jsonData (non-empty array) are required." },
        400,
      );
    }

    if (jsonData.length > MAX_ROWS) {
      return jsonResponse({ error: `Too many rows. Maximum is ${MAX_ROWS}.` }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const tableName = sanitizeIdentifier(sheetDisplayName, "sheet", Date.now() % 100000);

    const firstRow = jsonData[0];
    if (typeof firstRow !== "object" || firstRow === null || Array.isArray(firstRow)) {
      return jsonResponse({ error: "Each row in jsonData must be an object." }, 400);
    }

    const sourceKeys = Object.keys(firstRow);
    if (sourceKeys.length === 0) {
      return jsonResponse({ error: "jsonData rows must contain at least one column." }, 400);
    }
    if (sourceKeys.length > MAX_COLUMNS) {
      return jsonResponse({ error: `Too many columns. Maximum is ${MAX_COLUMNS}.` }, 400);
    }

    // Map original keys -> sanitized, deduplicated column names.
    const keyToColumn = new Map<string, string>();
    const usedColumns = new Set<string>();
    sourceKeys.forEach((key, index) => {
      let column = sanitizeIdentifier(key, "col", index);
      while (usedColumns.has(column)) {
        column = `${column}_${index}`;
      }
      usedColumns.add(column);
      keyToColumn.set(key, column);
    });

    const columnDefs: string[] = [];
    for (const column of usedColumns) {
      if (RESERVED_COLUMNS[column]) {
        columnDefs.push(`"${column}" ${RESERVED_COLUMNS[column]}`);
        continue;
      }

      const value = firstRow[[...keyToColumn.entries()].find(([, c]) => c === column)![0]];
      let columnType = "text";
      if (typeof value === "number") columnType = "numeric";
      else if (typeof value === "boolean") columnType = "boolean";

      columnDefs.push(`"${column}" ${columnType}`);
    }

    if (!usedColumns.has("id")) {
      columnDefs.unshift(`"id" ${RESERVED_COLUMNS.id}`);
    }
    if (!usedColumns.has("created_at")) {
      columnDefs.push(`"created_at" ${RESERVED_COLUMNS.created_at}`);
    }
    if (!usedColumns.has("updated_at")) {
      columnDefs.push(`"updated_at" ${RESERVED_COLUMNS.updated_at}`);
    }

    const createTableQuery = `CREATE TABLE public."${tableName}" (${columnDefs.join(", ")});`;

    const { error: createTableError } = await supabase.rpc("execute_ddl", {
      ddl_statement: createTableQuery,
      expected_table: tableName,
    });

    if (createTableError) {
      console.error("Error creating table:", createTableError);
      return jsonResponse(
        { error: "Failed to create table in Supabase.", details: createTableError.message },
        500,
      );
    }

    const insertionData = jsonData.map((row: Record<string, unknown>) => {
      const newRow: Record<string, unknown> = {};
      for (const [key, column] of keyToColumn.entries()) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
          newRow[column] = row[key];
        }
      }
      return newRow;
    });

    const { error: insertDataError } = await supabase.from(tableName).insert(insertionData);

    if (insertDataError) {
      console.error("Error inserting data:", insertDataError);
      await supabase
        .rpc("execute_ddl", { ddl_statement: `DROP TABLE IF EXISTS public."${tableName}";`, expected_table: tableName })
        .catch((e: unknown) => console.error("Cleanup failed:", e));
      return jsonResponse(
        { error: "Failed to insert data into new table.", details: insertDataError.message },
        500,
      );
    }

    const { error: metadataError } = await supabase
      .from("uploaded_spare_parts_sheets")
      .insert({ display_name: sheetDisplayName, table_name: tableName, created_by: userData.user.id });

    if (metadataError) {
      console.error("Error saving sheet metadata:", metadataError);
      await supabase
        .rpc("execute_ddl", { ddl_statement: `DROP TABLE IF EXISTS public."${tableName}";`, expected_table: tableName })
        .catch((e: unknown) => console.error("Cleanup failed:", e));
      return jsonResponse(
        { error: "Failed to save sheet metadata.", details: metadataError.message },
        500,
      );
    }

    return jsonResponse(
      { message: "Spare parts list created and data imported successfully.", tableName },
      200,
    );
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return jsonResponse({ error: "An unexpected error occurred." }, 500);
  }
});
