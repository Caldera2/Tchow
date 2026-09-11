# Notification Operations

Notification jobs are written to `notification_outbox` with the business write and are claimed by `process-notifications`. The worker is not a public browser API: configure `NOTIFICATION_WORKER_SECRET` and send `POST` requests with `x-notification-worker-secret` from a private scheduler every minute. Do not put this secret in the frontend or a `VITE_` variable. Failed jobs are retried with bounded exponential backoff and stale processing claims can be reclaimed after ten minutes.

Internal-channel jobs are delivered to the server-only `notification_internal_events` inbox. They are not email or WhatsApp messages; staff tooling or an approved internal consumer must read that inbox.

The current email adapter is Resend. Configure `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and a verified `EMAIL_FROM` sender. Register `/functions/v1/notification-provider-webhook` in Resend for the required email events. Store the Resend signing secret as `RESEND_WEBHOOK_SECRET`. The webhook verifies the raw body using Resend/Svix `svix-id`, `svix-timestamp`, and `svix-signature` headers, and stores each event by its event identity so later delivery or bounce events are retained.

Both notification functions have JWT verification disabled because the worker is called by a scheduler and the provider webhook has no customer JWT. The worker secret and Resend signature remain mandatory. Configure the scheduler only after the migration is applied and test it against a non-production project.

If the email provider is not configured, email jobs remain explicitly unconfigured/retryable and are never reported as delivered. Automated WhatsApp delivery remains disabled.
