# RentEase — Development Prompt v4 Addendum (Button & Action Styling Consistency)

Paste alongside v2 + v3. This fixes a specific failure mode: AI-generated UIs often render
Save/Create/Add actions as bare, unstyled `<button>` elements or plain clickable text instead of
properly styled buttons. This addendum makes button styling an explicit, non-negotiable rule and
lists every touchpoint across the whole app that must follow it.

═══════════════════════════════════════════════════
RULE (applies everywhere, no exceptions)
═══════════════════════════════════════════════════
Every action that saves, creates, submits, adds, or invites something MUST use the shared `Button`
component from `components/ui/Button.tsx` — never a bare `<button>` with no className, never a
plain `<a>` or text span styled to look clickable via color alone. If a button exists, it must look
like one: visible background or border, padding, radius, and a real hover/focus/active/disabled
state, per the variants below.

### Button component variants
```
Primary     bg-maroon-700, text white, hover bg-maroon-600, px-18 py-10, rounded-sm (3px),
            font-semibold, disabled: bg-ink-400 + cursor-not-allowed + no hover change
            → the ONE primary action per screen: Save, Create, Add Property, Invite Member,
              Confirm, Upgrade Plan

Secondary   bg-white, border 1px border-line, text ink-900, hover bg-sand-050, same padding/radius
            → Cancel, Back, secondary actions that sit next to a Primary button

Ghost       transparent background, text maroon-700, hover bg-sand-100, no border
            → low-emphasis actions inside tables/lists: "Edit", "View", "+ Add new" rows inside
              ComboBoxWithAddNew

Destructive bg-red-600, text white, hover bg a darker red, same padding/radius
            → Delete, Remove, Suspend, Cancel Subscription confirmation

Icon        36x36, border 1px border-line, bg white, centered icon, hover bg-sand-050
            → notification bell, table row actions, close buttons

All variants: focus-visible gets a 2px outline in gold-500 offset 2px. Loading state replaces label
with a small spinner + keeps button width stable (no layout jump). Every button has a minimum
44x36px hit area even if visually smaller, for touch usability.
```

═══════════════════════════════════════════════════
EVERY TOUCHPOINT THAT MUST USE THIS (audit checklist for the dev AI)
═══════════════════════════════════════════════════
Go through every screen built in v2/v3 and confirm each of these uses a real `Button`, not text:

Properties      "Add Property" (Primary) · "Add Unit" inside property detail (Primary) · "Edit"/
                "Delete" per unit row (Ghost/Destructive)
Tenants         "Add Tenant" (Primary) · "Upload Document" in tenant detail (Secondary) · lease
                history row actions (Ghost)
Leases          "New Lease" (Primary) · "Propose Renewal" (Primary) · "Approve"/"Reject" renewal
                (Primary/Destructive pair) · "Terminate Lease" (Destructive)
Maintenance     "New Request" (Primary) · "Assign Vendor" (Secondary) · kanban card status-move
                actions (Ghost) · "Attach Photo" (Secondary)
Payments        "Record Payment" (Primary) · "Mark as Paid" per row (Ghost, becomes Primary in a
                confirm step) · "Download Receipt" (Secondary)
Vendors         "Add Vendor" (Primary) · "Deactivate" (Destructive)
Expenses        "Add Expense" (Primary)
Reports         "Generate Report" (Primary) · "Export CSV" (Secondary)
Team & Roles    "Invite Member" (Primary) · "Create Custom Role" (Primary) · "Save Permissions"
                (Primary, sticky at bottom of the permission matrix) · "Remove Member" (Destructive)
Custom Lists    Every ComboBoxWithAddNew's "+ Add [typed text]" row (Ghost, inline) · Settings >
                Custom Lists page "Add Item" per tab (Primary) · "Deactivate"/"Delete" per item
                (Ghost/Destructive)
Integrations    "Save" per provider config form (Primary) · "Test Connection" (Secondary, shows a
                spinner then a success/error state inline, not just a toast) · "Disconnect"
                (Destructive)
Notifications   "Save template" (Primary) · toggle switches (not buttons — use a proper Switch
                component, not a checkbox styled as text)
Billing         "Upgrade"/"Downgrade" per plan card (Primary) · "Add Payment Method" (Secondary) ·
                "Cancel Subscription" (Destructive, behind a confirmation modal with its own Primary/
                Secondary button pair)
Settings        "Save Changes" (Primary) on Profile form · "← Back" in the Settings sidebar (Ghost)
Auth            "Log In" (Primary, full-width on the login form) · "Accept Invite & Set Password"
                (Primary) · "Send Reset Link" (Primary)
Tenant Portal   "Submit Request" (Primary) on the maintenance request form

Every one of the above must be visually reviewed against the variant rules — if any of them render
as plain text with no background/border, that is a bug to fix before the step is considered done.