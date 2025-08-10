/**
 * Test script to verify Gemini integration is working
 * Run this after setting up your GEMINI_API_KEY
 */

require("dotenv").config();
const { geminiService } = require("../dist/services/geminiService");

async function testGeminiIntegration() {
  console.log("🧪 Testing Gemini Integration...\n");

  // Test 1: Health Check
  console.log("1. Testing Gemini Health Check...");
  try {
    const isHealthy = await geminiService.healthCheck();
    console.log(`✅ Health Check: ${isHealthy ? "PASSED" : "FAILED"}\n`);
  } catch (error) {
    console.log(`❌ Health Check FAILED: ${error.message}\n`);
    return;
  }

  // Test 2: Resume Parsing
  console.log("2. Testing Resume Parsing...");
  const sampleResume = `
John Doe
Software Engineer
Email: john.doe@email.com
Phone: (555) 123-4567
Location: San Francisco, CA

SKILLS
- Python, JavaScript, React, Node.js
- AWS, Docker, Kubernetes
- Machine Learning, Data Analysis

EXPERIENCE
Software Engineer at Tech Corp
January 2020 - Present
- Developed web applications using React and Node.js
- Implemented machine learning models for data analysis
- Managed AWS infrastructure and Docker containers

Junior Developer at StartupXYZ
June 2018 - December 2019
- Built REST APIs using Python and Flask
- Collaborated with cross-functional teams
- Participated in agile development processes

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley
Graduated: 2018
GPA: 3.8
`;

  try {
    const parsedResume = await geminiService.parseResume(sampleResume);
    console.log("✅ Resume Parsing: PASSED");
    console.log("📊 Extracted Skills:", parsedResume.skills?.slice(0, 5));
    console.log("📊 Experience Years:", parsedResume.total_experience_years);
    console.log("📊 Education:", parsedResume.education?.[0]?.degree);
    console.log();
  } catch (error) {
    console.log(`❌ Resume Parsing FAILED: ${error.message}\n`);
  }

  // Test 3: Job Description Parsing
  console.log("3. Testing Job Description Parsing...");
  const sampleJobDescription = `
Senior Software Engineer - Full Stack

We are looking for a Senior Software Engineer to join our growing team.

REQUIREMENTS:
- 5+ years of software development experience
- Strong proficiency in Python, JavaScript, and React
- Experience with AWS cloud services
- Bachelor's degree in Computer Science or related field

PREFERRED QUALIFICATIONS:
- Experience with machine learning and data analysis
- Knowledge of Docker and Kubernetes
- Previous startup experience

RESPONSIBILITIES:
- Design and develop scalable web applications
- Collaborate with product and design teams
- Mentor junior developers
- Participate in code reviews and technical discussions

We offer competitive salary ($120,000 - $150,000), health benefits, and flexible work arrangements.
`;

  try {
    const parsedJob = await geminiService.parseJobDescription(
      sampleJobDescription
    );
    console.log("✅ Job Description Parsing: PASSED");
    console.log("📊 Required Skills:", parsedJob.required_skills?.slice(0, 5));
    console.log(
      "📊 Experience Required:",
      parsedJob.required_experience_years,
      "years"
    );
    console.log("📊 Salary Range:", parsedJob.salary_range);
    console.log();
  } catch (error) {
    console.log(`❌ Job Description Parsing FAILED: ${error.message}\n`);
  }

  console.log("🎉 Gemini Integration Test Complete!");
  console.log("\n💡 If all tests passed, your hybrid system is ready to use!");
  console.log("💡 Try creating a new evaluation to see the improved results.");
}

// Run the test
testGeminiIntegration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });
