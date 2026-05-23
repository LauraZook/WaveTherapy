#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Wave Therapy / CuraWaves customer onboarding app (wavetherapy.ai). Latest session:
  (a) Add Shop CTA to auto-emailed plan HTML, (b) Schedule dedicated 30-day testimonial
  reminder email (separate from re-assessment reminder), (c) Build in-app testimonial
  collection form replacing the Google Form, with submissions landing in admin dashboard,
  (d) Fix mobile questionnaire so each step lands the user at the top of the page.

backend:
  - task: "Testimonial submission endpoint (POST /api/testimonials)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          New public endpoint that accepts first_name, email, rating (1-5), headline (<=160),
          story (>=10 chars), primary_goal (optional), allow_publish (bool), plan_id (optional).
          Rate limited to 5/hour per IP. Stores in `testimonials` collection. If plan_id is
          provided and valid, denormalizes primary_protocol_title + program_length onto the
          testimonial doc, and marks the plan with testimonial_submitted_at + testimonial_id
          + testimonial_reminder_sent_at (so no further reminder is sent).
      - working: true
        agent: "testing"
        comment: |
          ✅ TESTED & WORKING. All test cases passed:
          - Valid submission (without plan_id): Returns 200 with {status:"ok", id:"<uuid>"}, testimonial stored in DB
          - Invalid payloads properly rejected with 422: rating=6, rating=0, story too short (<10 chars), missing required fields
          - With plan_id: Successfully links to plan, updates plan doc with testimonial_submitted_at, testimonial_id, testimonial_reminder_sent_at
          - Rate limiting active (5/hour per IP)
          - Testimonial data correctly stored in testimonials collection

  - task: "Admin testimonials list (GET /api/admin/testimonials)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Requires x-admin-token header (matches ADMIN_TOKEN env, default
          'curawaves-admin-2026'). Returns count, average_rating, testimonials[] sorted
          by created_at desc.
      - working: true
        agent: "testing"
        comment: |
          ✅ TESTED & WORKING. All test cases passed:
          - Without admin token: Returns 401 Unauthorized (correct)
          - With correct admin token: Returns 200 with {count, average_rating, testimonials:[]} sorted by created_at desc
          - Response structure matches expected format

  - task: "Plan testimonial-prefill endpoint (GET /api/plan/{id}/testimonial-prefill)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Lightweight public read returning only first_name, primary_protocol_title,
          program_length, already_submitted (bool). Used by the in-app testimonial form
          to greet the user and show context. Email is intentionally NOT returned (user
          re-enters it).
      - working: true
        agent: "testing"
        comment: |
          ✅ TESTED & WORKING. All test cases passed:
          - Valid plan_id: Returns 200 with {first_name, primary_protocol_title, program_length, already_submitted}
          - Invalid plan_id: Returns 404 Not Found (correct)
          - already_submitted=false for new plans, already_submitted=true after testimonial submission
          - Email is correctly NOT included in response (security/privacy)

  - task: "Dedicated testimonial reminder endpoint (POST /api/admin/send-testimonial-reminders)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Cron-triggered (requires x-admin-token). Sends a separate, dedicated email to
          plans where status='ready', testimonial_reminder_due_at <= now, and
          testimonial_reminder_sent_at is unset. Email contains a single CTA pointing to
          https://wavetherapy.ai/testimonial?plan_id={plan_id}. After successful send,
          marks testimonial_reminder_sent_at. Errors per plan are caught and logged, the
          loop continues for the next plan.
      - working: true
        agent: "testing"
        comment: |
          ✅ TESTED & WORKING. All test cases passed:
          - Without admin token: Returns 401 Unauthorized (correct)
          - With correct admin token: Returns 200 with {testimonial_reminders_sent: <int>}
          - Created test plan with past testimonial_reminder_due_at and status='ready'
          - Endpoint successfully sent reminder and updated plan with testimonial_reminder_sent_at
          - Error handling works (continues to next plan if one fails)
          - Email may be MOCKED in this environment (Resend API configured but may return mock responses)

  - task: "Plan creation now sets testimonial_reminder_due_at on every plan"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Inside POST /api/questionnaire/submit, every plan (regardless of autoimmune flag
          or program_length) now gets testimonial_reminder_due_at = created_at + 30 days.
          The existing reminder_due_at (re-assessment) is unchanged — still only set for
          autoimmune OR thirty_day plans.
      - working: true
        agent: "testing"
        comment: |
          ✅ TESTED & WORKING. Verified by creating a new plan via POST /api/questionnaire/submit:
          - testimonial_reminder_due_at is correctly set on every plan
          - Date is approximately 30 days in the future (verified 29-31 days range)
          - Separate from reminder_due_at (re-assessment reminder)
          - Works regardless of autoimmune flag or program_length

  - task: "Re-assessment reminder email cleaned up"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          POST /api/admin/send-reminders email body simplified — testimonial CTA removed
          (lives in the new dedicated testimonial reminder endpoint). Re-assessment button
          now points to https://wavetherapy.ai/reassess (was curawaves.com).
      - working: true
        agent: "testing"
        comment: |
          ✅ VERIFIED. Reviewed code at lines 869-884 of server.py:
          - Re-assessment reminder email no longer contains testimonial CTA
          - Button correctly points to https://wavetherapy.ai/reassess
          - Email is clean and focused on re-assessment only
          - Testimonial reminders are now handled by separate dedicated endpoint

  - task: "Auto-sent plan email includes Shop CTA"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          _build_plan_html() now appends a second CTA card under "Book a coaching session"
          pointing to https://curawaves.com/collections/all. Affects both auto-emails and
          the manual 'Email me this plan' button.
      - working: true
        agent: "testing"
        comment: |
          ✅ TESTED & WORKING. Verified:
          - POST /api/plan/email endpoint returns 200 OK
          - Shop CTA is present in _build_plan_html() at lines 591-600 of server.py
          - CTA points to https://curawaves.com/collections/all
          - Styled consistently with coaching session CTA
          - Appears in both auto-sent emails and manual "Email me this plan" requests
          - Email sending may be MOCKED in this environment (returns {mocked:true})

frontend:
  - task: "In-app testimonial submission page (/testimonial)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/Testimonial.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          New page. Accepts ?plan_id= query param and prefills first_name + primary_goal
          via GET /api/plan/{plan_id}/testimonial-prefill. Form fields: rating (5-star
          buttons), first_name, email, headline, story, primary_goal (only shown if no
          plan context), allow_publish checkbox. Submits to POST /api/testimonials. Shows
          a success state on completion with Shop + Home CTAs. Route registered in App.js.

  - task: "PlanResult testimonial CTA points to in-app form"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/PlanResult.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Replaced previous Google Form `<a>` with React Router `<Link to="/testimonial?plan_id=...">`.
          The downloaded HTML plan still uses an absolute URL but now points to
          ${window.location.origin}/testimonial?plan_id=... instead of Google Forms.

  - task: "Admin dashboard testimonials tab + reminder button"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/Admin.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Admin page rewritten with a Plans / Testimonials tab toggle. Both lists are
          loaded on login. New "Send testimonial reminders" button calls
          POST /api/admin/send-testimonial-reminders. Plans table gets a new "Testimonial"
          column showing Submitted / Reminder sent / Due date / —. Testimonial cards
          show stars, headline, story preview, publish flag, and a detail drawer.

  - task: "Onboarding mobile: scroll to top on every step change"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/Onboarding.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Added a stepTopRef anchor at the top of the questionnaire container and a
          useEffect([step]) that (1) blurs the focused field (iOS Safari fix),
          (2) window.scrollTo({top:0, behavior:'smooth'}), and
          (3) ref.scrollIntoView({block:'start'}). User now always lands on the first
          question of the new step.

metadata:
  created_by: "main_agent"
  version: "1.2"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "Testimonial submission endpoint (POST /api/testimonials)"
    - "Dedicated testimonial reminder endpoint (POST /api/admin/send-testimonial-reminders)"
    - "Plan creation now sets testimonial_reminder_due_at on every plan"
    - "Plan testimonial-prefill endpoint (GET /api/plan/{id}/testimonial-prefill)"
    - "Admin testimonials list (GET /api/admin/testimonials)"
    - "Auto-sent plan email includes Shop CTA"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Implemented a-d. Please test the backend tasks listed under test_plan.current_focus.
      Admin token is 'curawaves-admin-2026' (from /app/memory/test_credentials.md).
      Important:
      - POST /api/testimonials is rate limited to 5/hour per IP — please use distinct
        bodies or accept the 429 after 5 submits.
      - For the prefill + plan-link flow, first POST /api/questionnaire/submit (with
        consent_disclaimer=true) to obtain a plan_id, then POST /api/testimonials with
        that plan_id, then verify the plan doc was updated (testimonial_submitted_at).
      - To test the testimonial reminder cron, you may need to backdate
        testimonial_reminder_due_at on a plan to a past timestamp in MongoDB before
        calling /admin/send-testimonial-reminders. Resend email send may return
        {mocked:true} or fail in the local env — that's OK; we only need to verify
        the endpoint returns 200 and that testimonial_reminder_sent_at is set.
      - Auto-sent plan email Shop CTA can be verified by inspecting the returned HTML
        from a direct call to the internal _build_plan_html function — or simpler: POST
        /api/plan/email after a plan is ready and confirm 200.
  - agent: "testing"
    message: |
      ✅ ALL BACKEND TESTS PASSED (19/19 tests)
      
      Completed comprehensive testing of all backend endpoints:
      
      HIGH PRIORITY TASKS - ALL WORKING:
      1. POST /api/testimonials - Valid submissions, invalid payload rejection, rate limiting, plan linking
      2. POST /api/admin/send-testimonial-reminders - Authorization, reminder sending, plan updates
      3. Plan creation sets testimonial_reminder_due_at - Verified ~30 days in future on all plans
      
      MEDIUM PRIORITY TASKS - ALL WORKING:
      4. GET /api/admin/testimonials - Authorization and data retrieval
      5. GET /api/plan/{plan_id}/testimonial-prefill - Prefill data, already_submitted flag
      6. Auto-sent plan email includes Shop CTA - Verified in _build_plan_html()
      
      LOW PRIORITY TASKS - ALL WORKING:
      7. Re-assessment reminder email cleaned up - Code review confirms testimonial CTA removed
      
      REGRESSION TESTS - ALL PASSING:
      8. GET /api/protocols - Still working
      9. GET /api/admin/submissions - Still working
      10. POST /api/plan/email - Still working
      
      NOTES:
      - Email sending may be MOCKED in this environment (Resend API configured)
      - All database operations verified (testimonials collection, plan updates)
      - Rate limiting active and working (5/hour for testimonials)
      - All validation working correctly (rating 1-5, story >=10 chars, required fields)
      
      NO ISSUES FOUND. All backend functionality is working correctly.