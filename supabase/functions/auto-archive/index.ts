import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const archiveMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [students, attendance, centerGrades, onlineGrades, certificates, payments, homework, homeworkStatus, behavior, hallOfFame] = await Promise.all([
      supabase.from("students").select("*").eq("is_deleted", false),
      supabase.from("attendance").select("*"),
      supabase.from("center_grades").select("*"),
      supabase.from("online_grades").select("*"),
      supabase.from("certificates").select("*"),
      supabase.from("payments").select("*"),
      supabase.from("homework").select("*"),
      supabase.from("homework_status").select("*"),
      supabase.from("behavior_eval").select("*"),
      supabase.from("hall_of_fame").select("*"),
    ]);

    const snapshot = {
      archived_at: now.toISOString(),
      month: archiveMonth,
      students: students.data ?? [],
      attendance: attendance.data ?? [],
      center_grades: centerGrades.data ?? [],
      online_grades: onlineGrades.data ?? [],
      certificates: certificates.data ?? [],
      payments: payments.data ?? [],
      homework: homework.data ?? [],
      homework_status: homeworkStatus.data ?? [],
      behavior_eval: behavior.data ?? [],
      hall_of_fame: hallOfFame.data ?? [],
    };

    const { error } = await supabase
      .from("monthly_archives")
      .upsert(
        { archive_month: archiveMonth, archive_data: snapshot },
        { onConflict: "archive_month" }
      );

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, month: archiveMonth, records: Object.fromEntries(Object.entries(snapshot).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
