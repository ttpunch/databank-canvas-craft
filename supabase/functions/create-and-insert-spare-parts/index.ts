import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Include CORS header for actual requests as well
      },
      status: 405,
    });
  }

  try {
    const { sheetDisplayName, jsonData } = await req.json();

    if (!sheetDisplayName || !jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid input: sheetDisplayName and jsonData (array with content) are required." }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      // Use the service_role key for operations that require elevated privileges
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      },
    );

    // Generate a safe table name
    const baseTableName = sheetDisplayName.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/__+/g, "_");
    let tableName = baseTableName;
    let counter = 0;
    
    // Check for existing table names and append a counter if necessary
    // This is a basic check; for production, a more robust uniqueness check might be needed
    // This check is omitted for brevity and will rely on the `UNIQUE` constraint in `uploaded_spare_parts_sheets`
    // const { data: existingTables } = await supabase.from('uploaded_spare_parts_sheets').select('table_name').eq('table_name', tableName);
    // while (existingTables && existingTables.length > 0) {
    //   counter++;
    //   tableName = `${baseTableName}_${counter}`;
    //   const { data: newCheck } = await supabase.from('uploaded_spare_parts_sheets').select('table_name').eq('table_name', tableName);
    //   existingTables = newCheck;
    // }


    // Infer schema from the first row of JSON data
    const firstRow = jsonData[0];
    const columns: string[] = [];
    const coreColumns = [
      "id", "name", "description", "quantity", "category", 
      "part_id", "location", "supplier", "part_number", "manufacturer", 
      "machine_model", "part_category", "stock_quantity", "min_stock_level", 
      "unit_cost", "lead_time", "last_replaced_date", "last_used_at", "usage_count",
      "created_at", "updated_at"
    ];

    for (const key in firstRow) {
      if (Object.prototype.hasOwnProperty.call(firstRow, key)) {
        const sanitizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        let columnType = "text"; // Default to text

        if (coreColumns.includes(sanitizedKey)) {
          // If it's a known core column, use specific types
          switch (sanitizedKey) {
            case "id": columnType = "uuid PRIMARY KEY DEFAULT gen_random_uuid()"; break;
            case "quantity":
            case "stock_quantity":
            case "min_stock_level":
            case "usage_count":
            case "lead_time":
              columnType = "integer";
              break;
            case "unit_cost":
              columnType = "numeric";
              break;
            case "last_replaced_date":
            case "last_used_at":
            case "created_at":
            case "updated_at":
              columnType = "timestamp with time zone DEFAULT now()";
              break;
            default:
              columnType = "text"; // name, description, category, etc.
          }
        } else {
          // For unknown columns, try to infer type from value
          const value = firstRow[key];
          if (typeof value === "number") {
            columnType = "numeric";
          } else if (typeof value === "boolean") {
            columnType = "boolean";
          } else if (typeof value === "string" && !isNaN(Date.parse(value))) {
            columnType = "timestamp with time zone";
          }
        }
        
        // Add a primary key if 'id' is not present
        if (sanitizedKey === "id" && columnType.includes("PRIMARY KEY")) {
            columns.push(`${sanitizedKey} ${columnType}`);
        } else if (sanitizedKey === "id") { // If 'id' is present but not primary key, make it text
            columns.push(`${sanitizedKey} text`);
        } else {
            columns.push(`${sanitizedKey} ${columnType}`);
        }
      }
    }
    
    // Ensure 'id' column exists as primary key
    if (!columns.some(col => col.includes("id") && col.includes("PRIMARY KEY"))) {
      columns.unshift("id uuid PRIMARY KEY DEFAULT gen_random_uuid()");
    }
    // Ensure 'created_at' and 'updated_at' columns exist
    if (!columns.some(col => col.includes("created_at"))) {
      columns.push("created_at timestamp with time zone DEFAULT now()");
    }
    if (!columns.some(col => col.includes("updated_at"))) {
      columns.push("updated_at timestamp with time zone DEFAULT now()");
    }


    const createTableQuery = `CREATE TABLE public.${tableName} (${columns.join(", ")});`;

    const { error: createTableError } = await supabase.rpc('execute_sql', { sql_query: createTableQuery });

    if (createTableError) {
        console.error("Error creating table:", createTableError);
        return new Response(JSON.stringify({ error: "Failed to create table in Supabase.", details: createTableError.message }), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
            status: 500,
        });
    }

    // Prepare data for insertion
    const insertionData = jsonData.map((row: Record<string, any>) => {
      const newRow: Record<string, any> = {};
      for (const key in row) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
          const sanitizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "_");
          newRow[sanitizedKey] = row[key];
        }
      }
      return newRow;
    });

    const { error: insertDataError } = await supabase.from(tableName).insert(insertionData);

    if (insertDataError) {
      console.error("Error inserting data:", insertDataError);
      // Attempt to clean up the partially created table
      await supabase.rpc('execute_sql', { sql_query: `DROP TABLE public.${tableName};` }).catch(console.error);
      return new Response(JSON.stringify({ error: "Failed to insert data into new table.", details: insertDataError.message }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 500,
      });
    }

    // Record the new sheet in the metadata table
    const { error: metadataError } = await supabase
      .from("uploaded_spare_parts_sheets")
      .insert({ display_name: sheetDisplayName, table_name: tableName });

    if (metadataError) {
      console.error("Error saving sheet metadata:", metadataError);
      // Attempt to clean up the partially created table and data
      await supabase.rpc('execute_sql', { sql_query: `DROP TABLE public.${tableName};` }).catch(console.error);
      return new Response(JSON.stringify({ error: "Failed to save sheet metadata.", details: metadataError.message }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: "Spare parts list created and data imported successfully.", tableName: tableName }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred.", details: error.message }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      status: 500,
    });
  }
});
