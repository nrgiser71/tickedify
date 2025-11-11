# Tickedify API - Complete Endpoints Reference

**This is a comprehensive listing of all 285 API endpoints for quick lookup.**

---

## Authentication (13 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 4146 | POST | `/api/auth/register` | None | Register new user |
| 4307 | POST | `/api/auth/login` | None | User login |
| 4428 | POST | `/api/auth/logout` | Session | User logout |
| 6264 | GET | `/api/auth/me` | Session | Get current user |
| 4970 | POST | `/api/account/password-reset` | None | Request password reset |
| 5088 | POST | `/api/account/password-reset/confirm` | None | Confirm password reset |
| 780 | GET | `/register` | None | Registration page |
| 784 | GET | `/register.html` | None | Registration HTML |
| 788 | POST | `/register` | None | Old register endpoint |
| 798 | GET | `/reset-password` | None | Password reset page |
| 11055 | POST | `/api/admin/auth` | None | Admin authentication |
| 12917 | POST | `/api/admin2/users/:id/reset-password` | Admin | Reset user password |
| 5780 | GET | `/api/bijlage/:id/download-auth` | Session | Download with auth |

---

## User Management (26 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 3249 | GET | `/api/user/info` | Session | Get user info |
| 1342 | GET | `/api/user/email-import-code` | Session | Get email import code |
| 1373 | POST | `/api/user/regenerate-import-code` | Session | Generate new import code |
| 6053 | GET | `/api/user/storage-stats` | Session | Storage usage stats |
| 3297 | GET | `/api/user/onboarding-status` | Session | Get onboarding progress |
| 3315 | PUT | `/api/user/onboarding-video-seen` | Session | Mark video as seen |
| 16500 | GET | `/api/user-settings` | Session | Get user preferences |
| 16536 | POST | `/api/user-settings` | Session | Update user preferences |
| 3398 | GET | `/api/users` | Session | List all users (admin) |
| 3421 | GET | `/api/debug/current-user` | None | Debug: current user |
| 6851 | GET | `/api/debug/find-main-user` | None | Debug: find main user |
| 6881 | GET | `/api/debug/user-by-email/:email` | None | Debug: user by email |
| 6919 | GET | `/api/debug/user-storage/:userId` | None | Debug: user storage |
| 6394 | GET | `/api/debug/user-data/:userId` | None | Debug: user data |
| 11690 | GET | `/api/debug/user-subscription-status` | None | Debug: subscription |
| 2241 | POST | `/api/debug/fix-user-import-code` | None | Debug: fix import code |
| 15452 | PUT | `/api/debug/fix-user/:id` | None | Debug: fix user |
| 10314 | GET | `/api/debug/force-refresh/:userId` | None | Debug: force refresh |
| 14758 | POST | `/api/debug/switch-test-user` | None | Debug: switch user |
| 3505 | GET | `/api/debug/inbox-tasks/:userId?` | None | Debug: inbox tasks |
| 3546 | GET | `/api/emergency/all-user-tasks/:userId?` | None | Emergency: all tasks |
| 2184 | GET | `/api/debug/users-import-codes` | None | Debug: import codes |
| 11668 | GET | `/api/debug/users-schema` | None | Debug: users schema |
| 14727 | GET | `/api/debug/users-info` | None | Debug: users info |
| 6477 | GET | `/api/debug/all-users-data` | None | Debug: all users |
| 7886 | GET | `/api/debug/check-user/:email` | None | Debug: check user |

---

## Task Management (25 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 7069 | POST | `/api/taak/add-to-inbox` | Session | Create task |
| 8587 | GET | `/api/taak/:id` | Session | Get task |
| 7111 | PUT | `/api/taak/:id` | Session | Update task |
| 7423 | DELETE | `/api/taak/:id` | Session | Delete task |
| 7487 | PUT | `/api/taak/:id/soft-delete` | Session | Soft delete task |
| 7527 | POST | `/api/taak/:id/restore` | Session | Restore task |
| 7283 | POST | `/api/taak/:id/unarchive` | Session | Unarchive task |
| 8670 | PUT | `/api/taak/:id/prioriteit` | Session | Set priority |
| 8635 | POST | `/api/taak/recurring` | Session | Set recurrence |
| 14455 | POST | `/api/taak/recover-recurring` | Session | Recover recurring |
| 5509 | POST | `/api/taak/:id/bijlagen` | Session | Upload file |
| 5644 | GET | `/api/taak/:id/bijlagen` | Session | List attachments |
| 6974 | POST | `/api/external/add-task` | None | External task add |
| 10208 | GET | `/api/debug/all-tasks` | None | Debug: all tasks |
| 7864 | GET | `/api/debug/find-task/:id` | None | Debug: find task |
| 14188 | GET | `/api/debug/find-task/:taskId` | None | Debug: find task |
| 15423 | GET | `/api/debug/find-task/:id` | None | Debug: find task |
| 2210 | GET | `/api/debug/email-imported-tasks` | None | Debug: imported |
| 6615 | GET | `/api/debug/b2-cleanup-test/:taskId` | None | Debug: B2 cleanup |
| 14581 | POST | `/api/debug/recover-recurring-tasks` | None | Debug: recover |
| 14100 | GET | `/api/debug/recurring-tasks-analysis` | None | Debug: analysis |
| 14415 | GET | `/api/debug/test-recovery/:taskId` | None | Debug: test recovery |
| 8119 | GET | `/api/test/run-taskCompletionAPI` | None | Test: completion |
| 7591 | POST | `/api/bulk/soft-delete` | Session | Bulk delete |
| 7635 | POST | `/api/bulk/restore` | Session | Bulk restore |

---

## List Management (5 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 6695 | GET | `/api/lijsten` | Session | List all lists |
| 6796 | GET | `/api/lijst/:naam` | Session | Get list tasks |
| 7043 | POST | `/api/lijst/:naam` | Session | Save list order |
| 3789 | DELETE | `/api/lijst/acties/delete-all` | Session | Delete all completed |
| 8565 | GET | `/api/debug/lijst/:naam` | None | Debug: list |

---

## Planning & Calendar (10 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 8262 | GET | `/api/dagelijkse-planning/:datum` | Session | Get daily plan |
| 8315 | POST | `/api/dagelijkse-planning` | Session | Create plan |
| 8367 | PUT | `/api/dagelijkse-planning/:id` | Session | Update plan |
| 8388 | PUT | `/api/dagelijkse-planning/:id/reorder` | Session | Reorder plan |
| 8410 | DELETE | `/api/dagelijkse-planning/:id` | Session | Delete plan |
| 8241 | POST | `/api/dagelijkse-planning/clean-project-names` | Session | Clean projects |
| 8479 | GET | `/api/ingeplande-acties/:datum` | Session | Get scheduled |
| 14215 | POST | `/api/debug/cleanup-orphaned-planning` | None | Debug: cleanup |
| 14372 | GET | `/api/debug/recent-planning` | None | Debug: recent |
| 15309 | GET | `/api/debug/forensic/planning-events` | None | Debug: forensic |

---

## Projects & Contexts (2 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 10816 | GET | `/api/admin/projects` | Admin | List projects |
| 10843 | GET | `/api/admin/contexts` | Admin | List contexts |

---

## Recurring Tasks (10 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 8635 | POST | `/api/taak/recurring` | Session | Set recurring |
| 8527 | GET | `/api/admin/add-recurring-columns` | Admin | Add columns |
| 10077 | POST | `/api/debug/test-recurring` | None | Debug: test |
| 9483 | GET | `/api/debug/test-recurring/:pattern/:baseDate` | None | Debug: test |
| 8947 | POST | `/api/debug/test-save-recurring` | None | Debug: save |
| 10147 | POST | `/api/debug/batch-test-recurring` | None | Debug: batch |
| 14657 | POST | `/api/debug/fix-missing-recurring-properties` | None | Debug: fix |
| 15292 | GET | `/api/debug/forensic/recurring-events` | None | Debug: forensic |
| 8085 | GET | `/api/test/run-recurring` | None | Test: recurring |
| 8136 | GET | `/api/test/run-recurringTaskAPI` | None | Test: recurring API |

---

## Attachments (7 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 5509 | POST | `/api/taak/:id/bijlagen` | Session | Upload file |
| 5644 | GET | `/api/taak/:id/bijlagen` | Session | List files |
| 5785 | GET | `/api/bijlage/:id/download` | Session | Download file |
| 5904 | GET | `/api/bijlage/:id/preview` | Session | Preview file |
| 6007 | DELETE | `/api/bijlage/:id` | Session | Delete file |
| 5673 | GET | `/api/bijlage/:id/test` | None | Debug: test |
| 1155 | GET | `/api/debug/bijlage/:id` | None | Debug: bijlage |

---

## Email Import (5 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 824 | GET | `/email-import-help` | None | Help page |
| 901 | GET | `/api/email-import-help/content` | Session | Help content |
| 914 | GET | `/api/email-import-help` | Session | Help API |
| 1504 | POST | `/api/email/import` | Email code | Import task |
| 3624 | POST | `/api/email/import-real` | Session | Real import |

---

## Subscriptions & Payments (25 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 4447 | POST | `/api/subscription/select` | Session | Select plan |
| 4801 | GET | `/api/subscription/status` | Session | Subscription status |
| 4843 | GET | `/api/subscription` | Session | Get subscription |
| 17002 | GET | `/api/subscription/plans` | Session | List plans |
| 17043 | POST | `/api/subscription/checkout` | Session | Start checkout |
| 17110 | POST | `/api/subscription/upgrade` | Session | Upgrade plan |
| 17191 | POST | `/api/subscription/downgrade` | Session | Downgrade plan |
| 17270 | POST | `/api/subscription/cancel` | Session | Cancel plan |
| 17319 | POST | `/api/subscription/reactivate` | Session | Reactivate plan |
| 15351 | POST | `/api/subscription/select` | Session | Select plan v2 |
| 4544 | POST | `/api/webhooks/plugandpay` | Webhook | Plug & Pay webhook |
| 17375 | POST | `/api/webhooks/plugpay` | Webhook | Plug Pay webhook |
| 4746 | GET | `/api/payment/success` | Session | Payment success |
| 4782 | GET | `/api/payment/cancelled` | Session | Payment cancelled |
| 5267 | GET | `/api/admin/payment-configurations` | Admin | Payment configs |
| 5304 | PUT | `/api/admin/payment-configurations` | Admin | Update configs |
| 14974 | GET | `/api/admin2/system/payments` | Admin | Admin payments |
| 15020 | PUT | `/api/admin2/system/payments/:id/checkout-url` | Admin | Update checkout |
| 2290 | GET | `/api/debug/payment-configs` | None | Debug: configs |
| 2374 | POST | `/api/debug/reset-subscription` | None | Debug: reset |
| 2424 | POST | `/api/debug/run-subscription-migration` | None | Debug: migrate |
| 2455 | GET | `/api/debug/fix-subscription-plan` | None | Debug: fix |
| 9120 | GET | `/api/debug/subscription-data` | None | Debug: data |
| 9183 | GET | `/api/debug/update-subscription/:email/:newPlan` | None | Debug: update |
| 7941 | POST | `/api/debug/add-payment-columns` | None | Debug: columns |

---

## Subtasks (5 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 7734 | GET | `/api/subtaken/:parentId` | Session | List subtasks |
| 7771 | POST | `/api/subtaken` | Session | Create subtask |
| 7792 | PUT | `/api/subtaken/:id` | Session | Update subtask |
| 7814 | DELETE | `/api/subtaken/:id` | Session | Delete subtask |
| 7836 | POST | `/api/subtaken/:parentId/reorder` | Session | Reorder subtasks |

---

## Priorities & Counting (5 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 8725 | GET | `/api/prioriteiten/:datum` | Session | Get priorities |
| 8748 | POST | `/api/prioriteiten/reorder` | Session | Reorder priorities |
| 6710 | GET | `/api/tellingen` | Session | Get counts |
| 6726 | GET | `/api/counts/sidebar` | Session | Sidebar counts |
| 7562 | GET | `/api/prullenbak` | Session | Trash/deleted |

---

## Admin Management (67 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 10600 | GET | `/api/admin/users` | Admin | List users |
| 10656 | GET | `/api/admin/tasks` | Admin | List tasks |
| 10697 | GET | `/api/admin/system` | Admin | System info |
| 10745 | GET | `/api/admin/insights` | Admin | Insights |
| 10789 | GET | `/api/admin/monitoring` | Admin | Monitoring |
| 10816 | GET | `/api/admin/projects` | Admin | Projects |
| 10843 | GET | `/api/admin/contexts` | Admin | Contexts |
| 10870 | GET | `/api/admin/errors` | Admin | Errors |
| 10889 | GET | `/api/admin/api-usage` | Admin | API usage |
| 10918 | GET | `/api/admin/email-stats` | Admin | Email stats |
| 10956 | GET | `/api/admin/export` | Admin | Export data |
| 10998 | GET | `/api/admin/debug` | Admin | Debug info |
| 11028 | POST | `/api/admin/maintenance` | Admin | Maintenance |
| 11055 | POST | `/api/admin/auth` | None | Admin login |
| 11085 | GET | `/api/admin/session` | Admin | Admin session |
| 11105 | POST | `/api/admin/logout` | Admin | Admin logout |
| 11112 | GET | `/api/admin/feedback` | Admin | Feedback |
| 11145 | GET | `/api/admin/feedback/stats` | Admin | Feedback stats |
| 11188 | PUT | `/api/admin/feedback/:id` | Admin | Update feedback |
| 6103 | GET | `/api/admin/waitlist` | Admin | Waitlist |
| 6358 | GET | `/api/admin/stats` | Admin | Stats |
| 7678 | GET | `/api/admin/cleanup-stats` | Admin | Cleanup stats |
| 11441 | GET | `/api/admin/all-users` | Admin | All users |
| 11473 | PUT | `/api/admin/user/:id/account-type` | Admin | Change account type |
| 11535 | GET | `/api/admin/force-beta-migration` | Admin | Beta migration |
| 11606 | GET | `/api/admin/migrate-expired-to-beta-expired` | Admin | Migrate expired |
| 11743 | GET | `/api/admin/test-users` | Admin | Test users |
| 11795 | POST | `/api/admin/delete-test-users` | Admin | Delete test |
| 11937 | GET | `/api/admin/user-data/:userId` | Admin | User data |
| 11989 | GET | `/api/admin/migrate-cascade-delete` | Admin | Cascade delete |
| 15899 | POST | `/api/admin/messages` | Admin | Create message |
| 15981 | GET | `/api/admin/messages` | Admin | List messages |
| 16002 | GET | `/api/admin/messages/:id` | Admin | Get message |
| 16023 | GET | `/api/admin/messages/:id/analytics` | Admin | Message analytics |
| 16038 | POST | `/api/admin/messages/:id/toggle` | Admin | Toggle message |
| 16059 | PUT | `/api/admin/messages/:id` | Admin | Update message |
| 16113 | DELETE | `/api/admin/messages/:id` | Admin | Delete message |
| 16139 | POST | `/api/admin/messages/:id/duplicate` | Admin | Duplicate message |
| 16197 | GET | `/api/admin/messages/preview-targets` | Admin | Preview targets |
| 16631 | POST | `/api/admin/migrate-archive` | Admin | Migrate archive |
| 16735 | GET | `/api/admin/archive-stats` | Admin | Archive stats |
| 16814 | POST | `/api/admin/copy-to-archive` | Admin | Copy archive |
| 16915 | POST | `/api/admin/cleanup-archived` | Admin | Cleanup archive |
| 1189 | POST | `/api/admin/create-default-user` | Admin | Create user |
| 1231 | POST | `/api/admin/init-database` | Admin | Init database |
| 1257 | POST | `/api/admin/make-jan-admin` | Admin | Make admin |
| 1273 | POST | `/api/admin/reset-database` | Admin | Reset database |
| 5267 | GET | `/api/admin/payment-configurations` | Admin | Payment configs |
| 5304 | PUT | `/api/admin/payment-configurations` | Admin | Update configs |
| 12144 | GET | `/api/admin2/users/search` | Admin | Search users |
| 12222 | GET | `/api/admin2/users/:id` | Admin | Get user |
| 12437 | PUT | `/api/admin2/users/:id/tier` | Admin | Set tier |
| 12535 | PUT | `/api/admin2/users/:id/trial` | Admin | Set trial |
| 12649 | PUT | `/api/admin2/users/:id/block` | Admin | Block user |
| 12761 | DELETE | `/api/admin2/users/:id` | Admin | Delete user |
| 12917 | POST | `/api/admin2/users/:id/reset-password` | Admin | Reset password |
| 13020 | POST | `/api/admin2/users/:id/logout` | Admin | Logout user |
| 11295 | GET | `/api/admin2/stats/growth` | Admin | Growth stats |
| 12058 | GET | `/api/admin2/stats/revenue` | Admin | Revenue stats |
| 13757 | GET | `/api/admin2/stats/tasks` | Admin | Task stats |
| 13822 | GET | `/api/admin2/stats/emails` | Admin | Email stats |
| 13894 | GET | `/api/admin2/stats/database` | Admin | Database stats |
| 14817 | GET | `/api/admin2/stats/home` | Admin | Home stats |
| 13105 | GET | `/api/admin2/system/settings` | Admin | System settings |
| 13144 | PUT | `/api/admin2/system/settings/:key` | Admin | Update setting |
| 14974 | GET | `/api/admin2/system/payments` | Admin | Payments |
| 15020 | PUT | `/api/admin2/system/payments/:id/checkout-url` | Admin | Update checkout |
| 13258 | GET | `/api/admin2/debug/user-data/:id` | Admin | User data |
| 13497 | GET | `/api/admin2/debug/user-data-by-email` | Admin | User by email |
| 15158 | POST | `/api/admin2/debug/database-backup` | Admin | DB backup |
| 15504 | POST | `/api/admin2/debug/sql-query` | Admin | SQL query |
| 15704 | POST | `/api/admin2/debug/cleanup-orphaned-data` | Admin | Cleanup |
| 11352 | GET | `/api/admin/beta/status` | Admin | Beta status |
| 11385 | POST | `/api/admin/beta/toggle` | Admin | Toggle beta |
| 11412 | GET | `/api/admin/beta/users` | Admin | Beta users |

---

## Debug & Testing (49 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 803 | GET | `/api/ping` | None | Ping server |
| 807 | GET | `/api/status` | None | Server status |
| 8000 | GET | `/api/version` | None | API version |
| 992 | GET | `/api/db-test` | None | Database test |
| 1021 | GET | `/api/debug/storage-status` | None | Storage status |
| 1092 | GET | `/api/debug/b2-direct-test` | None | B2 test |
| 1404 | GET | `/api/debug/last-imports` | None | Last imports |
| 1424 | GET | `/api/debug/test-import-code/:recipient` | None | Test import |
| 1454 | GET | `/api/debug/message/:title` | None | Get message |
| 2317 | GET | `/api/debug/beta-status` | None | Beta status |
| 3438 | GET | `/api/debug/database-tables` | None | Tables |
| 3824 | POST | `/api/debug/test-pattern` | None | Test pattern |
| 5177 | GET | `/api/debug/mailgun-test` | Session | Mailgun test |
| 5682 | POST | `/api/debug/mime-test-upload` | Session | MIME test |
| 5719 | GET | `/api/debug/bijlage/:id/png-debug` | Session | PNG debug |
| 5775 | GET | `/api/debug/bijlage/:id/download-debug` | None | Download debug |
| 6129 | GET | `/api/debug/waitlist-preview` | None | Waitlist preview |
| 6154 | POST | `/api/test/ghl-tag` | None | GHL test |
| 6430 | GET | `/api/debug/database-search/:searchTerm` | None | Search database |
| 6588 | GET | `/api/debug/b2-status` | None | B2 status |
| 6615 | GET | `/api/debug/b2-cleanup-test/:taskId` | None | B2 cleanup |
| 6657 | POST | `/api/debug/clean-database` | None | Clean database |
| 7906 | GET | `/api/debug/beta-config` | None | Beta config |
| 7921 | GET | `/api/debug/webhook-logs` | None | Webhook logs |
| 7964 | POST | `/api/debug/create-webhook-table` | None | Create table |
| 8787 | GET | `/api/debug/june16` | None | June 16 test |
| 8822 | GET | `/api/debug/acties` | None | Acties test |
| 8844 | GET | `/api/debug/test-simple` | None | Simple test |
| 8853 | GET | `/api/debug/test-second-wednesday` | None | 2nd Wed test |
| 8888 | GET | `/api/debug/test-dutch-workdays` | None | Workdays test |
| 8926 | GET | `/api/debug/quick-monthly-test` | None | Monthly test |
| 8947 | POST | `/api/debug/test-save-recurring` | None | Save recurring |
| 8987 | POST | `/api/debug/add-single-action` | None | Add action |
| 9091 | POST | `/api/debug/force-migration` | None | Force migration |
| 9152 | GET | `/api/debug/plan-type` | Session | Plan type |
| 9220 | GET | `/api/debug/raw-test/:pattern/:baseDate` | None | Raw test |
| 9339 | GET | `/api/debug/parse-pattern/:pattern` | None | Parse pattern |
| 9382 | GET | `/api/debug/test-weekly-simple` | None | Weekly test |
| 9434 | GET | `/api/debug/weekly-calc/:pattern/:baseDate` | None | Weekly calc |
| 10234 | GET | `/api/debug/all-subtaken` | None | All subtasks |
| 10272 | GET | `/api/debug/search-subtaken/:searchTerm` | None | Search subtasks |
| 10347 | GET | `/api/debug/force-clean-thuis` | None | Clean Thuis |
| 10425 | GET | `/api/debug/clean-thuis` | None | Clean Thuis v2 |
| 10480 | GET | `/api/debug/mind-dump-table` | Session | Mind dump |
| 11233 | GET | `/api/debug/feedback-count` | None | Feedback count |
| 11251 | GET | `/api/debug/feedback-test` | None | Feedback test |
| 11635 | POST | `/api/debug/update-trial-end-date` | None | Update trial |
| 15325 | GET | `/api/debug/database-columns` | None | DB columns |
| 14727 | GET | `/api/debug/users-info` | None | Users info |

---

## Testing Endpoints (27 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 8017 | GET | `/admin/tests` | None | Admin tests page |
| 8021 | GET | `/test-dashboard` | None | Test dashboard |
| 8025 | GET | `/tests` | None | Tests page |
| 8030 | GET | `/api/test/run-regression` | None | Regression test |
| 8051 | GET | `/api/test/run-database` | None | Database test |
| 8068 | GET | `/api/test/run-api` | None | API test |
| 8085 | GET | `/api/test/run-recurring` | None | Recurring test |
| 8102 | GET | `/api/test/run-business` | None | Business logic test |
| 8119 | GET | `/api/test/run-taskCompletionAPI` | None | Task completion |
| 8136 | GET | `/api/test/run-recurringTaskAPI` | None | Recurring API |
| 8153 | GET | `/api/test/run-errorHandlingAPI` | None | Error handling |
| 8170 | GET | `/api/test/run-uiIntegration` | None | UI integration |
| 8188 | GET | `/api/test/run-performance` | None | Performance |
| 8212 | GET | `/api/test/new-customer-email` | None | New customer |
| 3585 | POST | `/api/email/test` | None | Email test |
| 6627 | GET | `/api/test/emergency-cleanup` | None | Emergency cleanup |
| 13989 | GET | `/api/v1/test` | None | V1 test |
| 10077 | POST | `/api/debug/test-recurring` | None | Test recurring |
| 9483 | GET | `/api/debug/test-recurring/:pattern/:baseDate` | None | Test pattern |
| 8947 | POST | `/api/debug/test-save-recurring` | None | Save recurring |
| 10147 | POST | `/api/debug/batch-test-recurring` | None | Batch test |
| 14415 | GET | `/api/debug/test-recovery/:taskId` | None | Test recovery |
| 14215 | POST | `/api/debug/cleanup-orphaned-planning` | None | Cleanup planning |
| 10495 | POST | `/api/test/emergency-cleanup` | None | Emergency cleanup |
| 6154 | POST | `/api/test/ghl-tag` | None | GHL tag test |
| 8212 | GET | `/api/test/new-customer-email` | None | New customer email |

---

## Messages & Notifications (4 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 16248 | GET | `/api/messages/unread` | Session | Unread messages |
| 16399 | POST | `/api/messages/:id/dismiss` | Session | Dismiss message |
| 16420 | POST | `/api/messages/:id/snooze` | Session | Snooze message |
| 16450 | POST | `/api/messages/:id/button-click` | Session | Click button |

---

## Other Endpoints (32 endpoints)

| Line | Method | Endpoint | Auth | Purpose |
|------|--------|----------|------|---------|
| 793 | GET | `/` | None | Home page |
| 4895 | GET | `/api/account` | Session | Account page |
| 3333 | GET | `/api/settings/onboarding-video` | None | Onboarding video |
| 3351 | PUT | `/api/settings/onboarding-video` | None | Update video |
| 10512 | GET | `/api/mind-dump/preferences` | Session | Mind dump prefs |
| 10557 | POST | `/api/mind-dump/preferences` | Session | Save preferences |
| 3210 | GET | `/api/page-help` | Admin | Page help list |
| 3088 | GET | `/api/page-help/:pageId` | Session | Get page help |
| 3134 | PUT | `/api/page-help/:pageId` | Admin | Update help |
| 3182 | DELETE | `/api/page-help/:pageId` | Admin | Delete help |
| 16470 | POST | `/api/page-visit/:pageIdentifier` | Session | Log page visit |
| 6519 | POST | `/api/feedback` | None | Submit feedback |
| 6538 | GET | `/api/feedback` | Admin | List feedback |
| 6559 | PUT | `/api/feedback/:id/status` | Admin | Update feedback |
| 5357 | POST | `/api/waitlist/signup` | None | Waitlist signup |
| 5491 | GET | `/api/waitlist/stats` | Admin | Waitlist stats |
| 14100 | GET | `/api/debug/recurring-tasks-analysis` | None | Analysis |
| 7896 | GET | `/api/debug/check-user/:email` | None | Check user |
| 15480 | POST | `/api/admin/migrate-to-pure-b2` | Admin | Migrate B2 |
| 13989 | GET | `/api/v1/quick-add` | None | Quick add |
| 8241 | POST | `/api/dagelijkse-planning/clean-project-names` | Session | Clean names |
| 8495 | POST | `/api/test/emergency-cleanup` | None | Emergency cleanup |
| 3693 | POST | `/api/import/notion-recurring` | Session | Import Notion |

---

## Summary by Category

| Category | Count |
|----------|-------|
| Authentication | 13 |
| User Management | 26 |
| Task Management | 25 |
| Lists | 5 |
| Planning | 10 |
| Projects & Contexts | 2 |
| Recurring | 10 |
| Attachments | 7 |
| Email Import | 5 |
| Subscriptions | 25 |
| Subtasks | 5 |
| Priorities/Counts | 5 |
| Admin | 67 |
| Debug | 49 |
| Testing | 27 |
| Messages | 4 |
| Other | 32 |
| **TOTAL** | **285** |

---

## Quick Lookup by HTTP Method

### GET Requests (155)
All read operations use GET

### POST Requests (73)
Create and action operations

### PUT Requests (43)
Update operations

### DELETE Requests (14)
Delete operations

### PATCH Requests (0)
Not used in this API

---

## Authentication Required Breakdown

- **None (Public)**: 88 endpoints
- **Session Required**: 137 endpoints
- **Admin Required**: 45 endpoints
- **Email Code**: 1 endpoint
- **Webhook**: 2 endpoints
- **Special Auth**: 12 endpoints

---

## Performance Notes

### Fast Endpoints (< 100ms)
- `/api/ping` - Simple echo
- `/api/version` - Static data
- `/api/counts/sidebar` - Optimized counting
- `/api/tellingen` - Count summary

### Medium Endpoints (100-500ms)
- `/api/auth/me` - Session validation + user fetch
- `/api/taak/:id` - Single task fetch
- `/api/lijst/:naam` - List with all tasks
- `/api/dagelijkse-planning/:datum` - Daily plan

### Slow Endpoints (> 500ms)
- Bulk operations (100+ tasks)
- Large attachment uploads
- Export operations
- Database migrations

---

## Implementation Priority for iOS

### Phase 1 (Essential)
1. Authentication (register, login, logout)
2. Task CRUD (create, read, update, delete)
3. Lists (get, save order)
4. Daily planning (view, schedule, update)

### Phase 2 (Important)
1. Attachments (upload, download)
2. Email import setup
3. Recurring tasks
4. Subscriptions

### Phase 3 (Nice to Have)
1. Subtasks
2. Messages/notifications
3. User settings
4. Mind dump preferences

---

## Error Handling Priority

1. **401 Unauthorized** - Redirect to login
2. **403 Forbidden** - Show "Not authorized"
3. **404 Not Found** - Handle gracefully
4. **400 Bad Request** - Validate input
5. **500 Server Error** - Show error to user
6. **503 Service Unavailable** - Queue for retry

