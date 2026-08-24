# System Design Write-up: Society Maintenance Tracker

## 1. Complaint History Model

The complaint lifecycle is built around an **event-sourcing-inspired** pattern where every state change is recorded as an immutable event in the `complaint_history` table, while the `complaints` table maintains the current aggregate state for efficient querying.

**Schema Design**: The `complaint_history` table captures `old_status`, `new_status`, `changed_by` (actor), an optional `note`, and a `created_at` timestamp. This gives us a complete audit trail — who changed what, when, and why. The `old_status` field is `NULL` on the initial creation event, clearly distinguishing complaint creation from status transitions.

**Lifecycle Enforcement**: Status transitions follow a directed workflow: `Open → In Progress → Resolved`. The API enforces that resolved complaints cannot be updated further — once `Resolved`, the `resolved_at` timestamp is set and the complaint is effectively closed. The backend validates transitions and rejects invalid ones (e.g., trying to move a Resolved complaint back to Open).

**Why a Separate History Table?** Storing history separately from the complaints table follows the **CQRS principle** — the complaints table is optimized for reads (current state queries, filtering, dashboard aggregation), while the history table provides the full event log on demand. This avoids bloating the main table while preserving complete traceability. Each history entry also records the actor (`changed_by`), which is critical for accountability in a multi-user system.

**Trade-offs**: This design stores some redundancy (the current status exists both in `complaints.status` and as the latest `complaint_history.new_status`). However, this is intentional — it allows O(1) status lookups for listing and filtering without requiring a join or subquery to the history table, which is essential for dashboard performance.

## 2. Overdue Detection Strategy

Overdue detection uses a **hybrid approach** combining configurable thresholds, lazy evaluation, and manual override.

**Configurable Threshold**: The `settings` table stores an `overdue_days` value (default: 7). This is a simple key-value pair that the admin can adjust without redeploying. The overdue check reads this dynamically on each request, so changes take effect immediately.

**Lazy Evaluation**: Rather than running a background cron job, overdue flags are computed **on-demand** when the admin requests the complaints list. The server runs an `UPDATE` query that sets `is_overdue = 1` for all `Open` or `In Progress` complaints whose `created_at` exceeds the threshold. This pattern is efficient for a single-society deployment — it avoids the complexity of schedulers while ensuring the admin always sees current data. The `is_overdue` column is indexed for fast filtering.

**Manual Override**: Admins can also manually flag any unresolved complaint as overdue via `POST /api/complaints/:id/overdue`, regardless of the time threshold. This handles edge cases where a complaint is urgent but hasn't aged past the threshold.

**Auto-Clear on Resolution**: When a complaint is marked `Resolved`, the `is_overdue` flag is automatically cleared. This ensures resolved complaints don't pollute overdue counts.

**Surfacing**: Overdue complaints are sorted to the top of the admin view using `ORDER BY is_overdue DESC, created_at DESC`. In the UI, they receive a distinctive red pulsing badge and a red left border, making them immediately visible.

## 3. Photo Handling

Photo uploads are handled via **Multer** (Express multipart middleware) with a deliberate set of constraints.

**Upload Flow**: When a resident creates a complaint with a photo, the frontend sends a `multipart/form-data` request. Multer processes the file on the server side, saving it to `server/uploads/` with a unique filename (`{timestamp}-{random}.{ext}`) to prevent collisions. The relative path (`/uploads/filename.jpg`) is stored in `complaints.photo_url`.

**Validation**: Files are validated at two levels: (1) MIME type check allows only `image/jpeg`, `image/png`, `image/webp`, and `image/gif`; (2) file size is capped at 5MB. Invalid files are rejected with descriptive error messages.

**Serving**: Express serves the uploads directory as static files via `app.use('/uploads', express.static(...))`. In development, the Vite proxy forwards `/uploads/*` requests to the backend server. In production, the same Express instance serves both the React build and uploaded files.

**Why Filesystem over Cloud Storage?** For a self-contained, easily deployable society tracker, filesystem storage is the simplest and most portable approach. The README documents how to migrate to cloud storage (S3, Cloudinary) if needed — it's a matter of swapping the Multer storage engine and updating the URL generation.

**Frontend Experience**: The complaint form includes a drag-and-click upload zone with instant preview. The complaint detail page displays the photo inline with hover-zoom interaction.

## 4. Notification Flow

Email notifications are implemented using **Nodemailer** with **Ethereal** as the default test SMTP provider.

**Architecture**: The email service initializes on server start by auto-generating Ethereal test credentials. All sent emails are captured in Ethereal's web interface, allowing developers to verify email content without sending real emails. The console logs the Ethereal credentials and URL for easy access.

**Trigger Points**: Emails are sent at two points in the workflow:
1. **Complaint Status Change**: When an admin updates a complaint's status (via `PATCH /api/complaints/:id/status`), the system sends an HTML email to the complaint's resident with the old status, new status, optional note, and visual status badges.
2. **Important Notice**: When an admin posts a notice marked as `is_important`, the system iterates over all residents and sends each one a notification email with the notice title and content.

**Email Templates**: Both email types use inline-styled HTML templates matching the app's dark theme aesthetic. Status badges use the same color coding as the UI (blue for Open, amber for In Progress, green for Resolved).

**Async & Non-Blocking**: Email sending is `async` and wrapped in try-catch blocks. If email delivery fails (network error, SMTP issue), the failure is logged but does not block the API response. This ensures that a flaky email service never prevents an admin from updating a complaint.

**Production Migration**: The README documents how to swap Ethereal for a real SMTP provider (Gmail, SendGrid, AWS SES) by changing the transporter configuration in `server/services/email.js`. The rest of the notification flow remains unchanged.

**Rate Considerations**: For the "important notice" broadcast, emails are sent sequentially in a loop rather than in parallel. This is intentional — it respects SMTP rate limits and avoids overwhelming the mail server. For larger societies, this could be upgraded to a queue-based system (Bull, BullMQ) that processes emails asynchronously with retry logic.
