-- Performance optimization indexes for the candidate evaluation system

-- Composite indexes for frequently queried combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evaluations_job_score 
ON evaluations(job_posting_id, overall_score DESC, evaluated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evaluations_resume_job 
ON evaluations(resume_id, job_posting_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evaluations_status_job 
ON evaluations(status, job_posting_id);

-- Indexes for shortlist operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shortlist_candidates_shortlist_candidate 
ON shortlist_candidates(shortlist_id, candidate_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shortlists_job_created 
ON shortlists(job_posting_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shortlists_status_job 
ON shortlists(status, job_posting_id);

-- Indexes for resume operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resumes_job_uploaded 
ON resumes(job_posting_id, uploaded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resumes_candidate_job 
ON resumes(candidate_id, job_posting_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resumes_status_job 
ON resumes(status, job_posting_id);

-- Indexes for skill matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skill_matches_evaluation_skill 
ON skill_matches(evaluation_id, skill_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skill_matches_matched_required 
ON skill_matches(matched, required, evaluation_id);

-- Indexes for job postings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_status_created 
ON job_postings(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_org_status 
ON job_postings(organization_id, status, created_at DESC);

-- Indexes for candidates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_name 
ON candidates(first_name, last_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_created 
ON candidates(created_at DESC);

-- Indexes for email communications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_communications_shortlist_type 
ON email_communications(shortlist_id, email_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_communications_status_sent 
ON email_communications(delivery_status, sent_at DESC);

-- Partial indexes for active records only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_active 
ON job_postings(created_at DESC) 
WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evaluations_completed 
ON evaluations(job_posting_id, overall_score DESC) 
WHERE status = 'completed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resumes_processed 
ON resumes(job_posting_id, uploaded_at DESC) 
WHERE status IN ('processed', 'evaluated');

-- GIN indexes for JSONB columns (for better search performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evaluations_details_gin 
ON evaluations USING GIN (evaluation_details);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_requirements_gin 
ON job_postings USING GIN (parsed_requirements);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resumes_data_gin 
ON resumes USING GIN (parsed_data);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shortlists_criteria_gin 
ON shortlists USING GIN (selection_criteria);

-- Text search indexes for full-text search capabilities
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_title_trgm 
ON job_postings USING GIN (title gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_description_trgm 
ON job_postings USING GIN (description gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_name_trgm 
ON candidates USING GIN ((first_name || ' ' || last_name) gin_trgm_ops);

-- Enable pg_trgm extension for trigram matching (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Statistics updates for better query planning
ANALYZE evaluations;
ANALYZE job_postings;
ANALYZE resumes;
ANALYZE candidates;
ANALYZE shortlists;
ANALYZE shortlist_candidates;
ANALYZE skill_matches;
ANALYZE email_communications;