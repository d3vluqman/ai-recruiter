/**
 * Script to re-evaluate all existing candidates with the fixed ML service
 * Run this after fixing the ML service spaCy model issue
 */

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function reEvaluateAllCandidates() {
  try {
    console.log("🔄 Starting re-evaluation of all candidates...");

    // Get all evaluations that need to be re-run
    const { data: evaluations, error } = await supabase
      .from("evaluations")
      .select(
        `
        id,
        resume_id,
        job_posting_id,
        overall_score,
        skill_score,
        experience_score,
        education_score
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    console.log(`📊 Found ${evaluations.length} evaluations to re-run`);

    let successCount = 0;
    let errorCount = 0;

    for (const evaluation of evaluations) {
      try {
        console.log(
          `🔄 Re-evaluating candidate ${evaluation.resume_id} for job ${evaluation.job_posting_id}...`
        );

        // Trigger re-evaluation via backend API
        const response = await axios.post(
          `${BACKEND_URL}/api/evaluations/re-evaluate/${evaluation.id}`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 30000, // 30 second timeout
          }
        );

        if (response.status === 200) {
          successCount++;
          console.log(
            `✅ Successfully re-evaluated evaluation ${evaluation.id}`
          );
        } else {
          errorCount++;
          console.log(
            `❌ Failed to re-evaluate evaluation ${evaluation.id}: ${response.statusText}`
          );
        }

        // Add small delay to avoid overwhelming the ML service
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        errorCount++;
        console.log(
          `❌ Error re-evaluating evaluation ${evaluation.id}:`,
          error.message
        );
      }
    }

    console.log("\n📈 Re-evaluation Summary:");
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📊 Total: ${evaluations.length}`);
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

// Run the script
reEvaluateAllCandidates()
  .then(() => {
    console.log("🎉 Re-evaluation script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
