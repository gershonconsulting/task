// The 10 process templates per the FEATURE-SPECIFICATION.
// Each project is created from one of these. Tasks below are inserted into
// the tasks table at project creation time.
//
// dueOffsetDays is days from project start_date (negative = before launch).
// priority defaults to 'medium' if omitted.

export type Priority = 'low' | 'medium' | 'high';

export interface TemplateTask {
  id: string;                 // stable id within the template, used as tasks.template_item_id
  name: string;
  description?: string;
  assignedTo: string | null;  // display name or null for unassigned
  priority?: Priority;
  dueOffsetDays?: number;
}

export interface ProcessTemplate {
  slug: string;               // url-safe id; what goes in projects.template_slug
  label: string;
  icon: string;               // emoji or FontAwesome name fragment
  color: string;              // hex used in the UI swatches
  description: string;
  tasks: TemplateTask[];
}

export const TEMPLATES: ProcessTemplate[] = [
  {
    slug: 'client-onboarding',
    label: 'Client Onboarding',
    icon: '🎯',
    color: '#CC3333',
    description: 'Setup checklist for a new client engagement.',
    tasks: [
      { id: 'co-xero',     name: 'Create user in Xero',                 assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 1 },
      { id: 'co-invoices', name: 'Create line invoices',                assignedTo: 'Olivier',       priority: 'high',   dueOffsetDays: 2 },
      { id: 'co-streak-p', name: 'Create project in Streak',            assignedTo: 'Aina Rama',     priority: 'medium', dueOffsetDays: 1 },
      { id: 'co-master',   name: 'Create master Google Doc',            assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 2 },
      { id: 'co-streak-c', name: 'Create client in Streak',             assignedTo: 'Aina Rama',     priority: 'medium', dueOffsetDays: 1 },
      { id: 'co-logo',     name: 'Add logo to gershonconsulting.com',   assignedTo: 'Winnie Lauren', priority: 'low',    dueOffsetDays: 5 },
      { id: 'co-origin',   name: 'Inform origin',                       assignedTo: null,             priority: 'low',    dueOffsetDays: 3 },
      { id: 'co-email',    name: 'Create client@gershonconsulting.com', assignedTo: 'Sai',            priority: 'medium', dueOffsetDays: 2 },
    ],
  },

  {
    slug: 'monthly-report',
    label: 'Monthly Report',
    icon: '📊',
    color: '#3366CC',
    description: 'End-of-month status report delivery.',
    tasks: [
      { id: 'mr-verify-master',  name: 'Verify master document content',          assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 22 },
      { id: 'mr-ask-missing',    name: 'Ask team for missing info',               assignedTo: 'Aina Rama',     priority: 'medium', dueOffsetDays: 23 },
      { id: 'mr-collect-data',   name: 'Collect latest data',                     assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 25 },
      { id: 'mr-save-pdf',       name: 'Save report as PDF',                      assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 27 },
      { id: 'mr-request-comp',   name: 'Request completion from contributors',    assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 24 },
      { id: 'mr-request-up',     name: 'Request uploads',                         assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 25 },
      { id: 'mr-verify-acc',     name: 'Verify accuracy / QC pass 1',             assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 27 },
      { id: 'mr-copy-analytics', name: 'Copy data to analytics dashboard',        assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 28 },
      { id: 'mr-qc2',            name: 'Quality control pass 2',                  assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 28 },
      { id: 'mr-upload-system',  name: 'Upload to system',                        assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 29 },
      { id: 'mr-final-qc',       name: 'Final QC review',                         assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 29 },
      { id: 'mr-send-client',    name: 'Send report to client',                   assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 30 },
      { id: 'mr-confirm',        name: 'Confirm client receipt',                  assignedTo: 'Winnie Lauren', priority: 'low',    dueOffsetDays: 31 },
    ],
  },

  {
    slug: 'social-content-creation',
    label: 'Social Content Creation',
    icon: '📝',
    color: '#3366CC',
    description: 'Monthly social content production via CloudCampaign.',
    tasks: [
      { id: 'scc-create',    name: 'Create content on CloudCampaign',     assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 5 },
      { id: 'scc-approval',  name: 'Send for client approval',            assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 7 },
      { id: 'scc-feedback',  name: 'Collect feedback',                    assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 10 },
      { id: 'scc-update',    name: 'Update based on comments',            assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 12 },
      { id: 'scc-publish',   name: 'Publish content',                     assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 15 },
    ],
  },

  {
    slug: 'social-selling',
    label: 'Social Selling',
    icon: '💼',
    color: '#00AA66',
    description: 'LinkedIn-based outbound social selling kickoff.',
    tasks: [
      { id: 'ss-start',     name: 'Start project',                       assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 0 },
      { id: 'ss-forms',     name: 'Send forms to client',                assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 1 },
      { id: 'ss-review',    name: 'Review completed forms',              assignedTo: 'Aina Rama',     priority: 'medium', dueOffsetDays: 3 },
      { id: 'ss-invoice',   name: 'Send invoice',                        assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 2 },
      { id: 'ss-cloud',     name: 'Setup CloudCampaign',                 assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 5 },
    ],
  },

  {
    slug: 'lead-generation',
    label: 'Lead Generation',
    icon: '🎣',
    color: '#FF6600',
    description: 'B2B outbound lead gen via Snov.io + LinkedIn.',
    tasks: [
      { id: 'lg-start',     name: 'Start project',                       assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 0 },
      { id: 'lg-prep',      name: 'Initial preparation',                 assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 1 },
      { id: 'lg-quest',     name: 'Send questionnaire',                  assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 2 },
      { id: 'lg-doc',       name: 'Create documentation',                assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 3 },
      { id: 'lg-email',     name: 'Setup email infrastructure',          assignedTo: 'Sai',           priority: 'high',   dueOffsetDays: 4 },
    ],
  },

  {
    slug: 'facturation',
    label: 'Facturation',
    icon: '💳',
    color: '#9933CC',
    description: 'Invoicing and payment collection cycle.',
    tasks: [
      { id: 'fa-draft',    name: 'Prepare draft invoices',     assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 1 },
      { id: 'fa-issue',    name: 'Issue final invoices',       assignedTo: 'Olivier',       priority: 'high',   dueOffsetDays: 2 },
      { id: 'fa-r1',       name: 'Send payment reminder 1',    assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 9 },
      { id: 'fa-r2',       name: 'Send payment reminder 2',    assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 16 },
    ],
  },

  {
    slug: 'market-research',
    label: 'Market Research',
    icon: '🔍',
    color: '#CCCC00',
    description: 'Full market research report with 3 versions and exec summary.',
    tasks: [
      { id: 'mres-01',  name: 'Send invoice #1',                       assignedTo: null, priority: 'high',   dueOffsetDays: 0 },
      { id: 'mres-02',  name: 'Confirm invoice #1 paid',               assignedTo: null, priority: 'high',   dueOffsetDays: 3 },
      { id: 'mres-03',  name: 'Create Google Drive folder',            assignedTo: null, priority: 'medium', dueOffsetDays: 1 },
      { id: 'mres-04',  name: 'Collect marketing data',                assignedTo: null, priority: 'medium', dueOffsetDays: 5 },
      { id: 'mres-05',  name: 'Send questionnaire',                    assignedTo: null, priority: 'medium', dueOffsetDays: 2 },
      { id: 'mres-06',  name: 'Receive questionnaire responses',       assignedTo: null, priority: 'medium', dueOffsetDays: 7 },
      { id: 'mres-07',  name: 'Publish version #1',                    assignedTo: null, priority: 'high',   dueOffsetDays: 14 },
      { id: 'mres-08',  name: 'Quality control #1',                    assignedTo: null, priority: 'high',   dueOffsetDays: 15 },
      { id: 'mres-09',  name: 'Send version #1 to client',             assignedTo: null, priority: 'high',   dueOffsetDays: 16 },
      { id: 'mres-10',  name: 'Receive comments on version #1',        assignedTo: null, priority: 'medium', dueOffsetDays: 21 },
      { id: 'mres-11',  name: 'Send invoice #2',                       assignedTo: null, priority: 'high',   dueOffsetDays: 22 },
      { id: 'mres-12',  name: 'Confirm invoice #2 paid',               assignedTo: null, priority: 'high',   dueOffsetDays: 25 },
      { id: 'mres-13',  name: 'Publish version #2',                    assignedTo: null, priority: 'high',   dueOffsetDays: 28 },
      { id: 'mres-14',  name: 'Quality control #2',                    assignedTo: null, priority: 'high',   dueOffsetDays: 29 },
      { id: 'mres-15',  name: 'Send version #2 to client',             assignedTo: null, priority: 'high',   dueOffsetDays: 30 },
      { id: 'mres-16',  name: 'Receive comments on version #2',        assignedTo: null, priority: 'medium', dueOffsetDays: 35 },
      { id: 'mres-17',  name: 'Publish version #3',                    assignedTo: null, priority: 'high',   dueOffsetDays: 38 },
      { id: 'mres-18',  name: 'Quality control #3',                    assignedTo: null, priority: 'high',   dueOffsetDays: 39 },
      { id: 'mres-19',  name: 'Send version #3 to client',             assignedTo: null, priority: 'high',   dueOffsetDays: 40 },
      { id: 'mres-20',  name: 'Create executive summary',              assignedTo: null, priority: 'high',   dueOffsetDays: 42 },
      { id: 'mres-21',  name: "Create 'What surprised us' section",    assignedTo: null, priority: 'medium', dueOffsetDays: 42 },
      { id: 'mres-22',  name: 'Create Gershon Score',                  assignedTo: null, priority: 'medium', dueOffsetDays: 42 },
      { id: 'mres-23',  name: 'Create key findings presentation',      assignedTo: null, priority: 'high',   dueOffsetDays: 44 },
      { id: 'mres-24',  name: 'Publish final version',                 assignedTo: null, priority: 'high',   dueOffsetDays: 45 },
    ],
  },

  {
    slug: 'staff-onboarding',
    label: 'Staff Onboarding',
    icon: '🧑‍💼',
    color: '#66CCCC',
    description: 'New Gershon team member intake.',
    tasks: [
      { id: 'so-confirm',       name: 'Confirmation of hire',                 assignedTo: null, priority: 'high',   dueOffsetDays: 0 },
      { id: 'so-email',         name: 'Setup email & contact',                assignedTo: null, priority: 'high',   dueOffsetDays: 1 },
      { id: 'so-access',        name: 'Provision tool access',                assignedTo: null, priority: 'high',   dueOffsetDays: 2 },
      { id: 'so-calendar',      name: 'Calendar / availability sync',         assignedTo: null, priority: 'medium', dueOffsetDays: 2 },
      { id: 'so-nda',           name: 'Send & sign NDA',                      assignedTo: null, priority: 'high',   dueOffsetDays: 1 },
      { id: 'so-video',         name: 'Send onboarding video',                assignedTo: null, priority: 'medium', dueOffsetDays: 1 },
      { id: 'so-tools-streak',  name: 'Train on Streak',                      assignedTo: null, priority: 'medium', dueOffsetDays: 3 },
      { id: 'so-tools-snov',    name: 'Train on Snov.io',                     assignedTo: null, priority: 'medium', dueOffsetDays: 3 },
      { id: 'so-intro',         name: 'Team introduction',                    assignedTo: null, priority: 'medium', dueOffsetDays: 5 },
      { id: 'so-first-task',    name: 'Assign first project task',            assignedTo: null, priority: 'medium', dueOffsetDays: 7 },
      { id: 'so-checkin',       name: '2-week check-in',                      assignedTo: null, priority: 'medium', dueOffsetDays: 14 },
    ],
  },

  {
    slug: 'onboarding-partner',
    label: 'Onboarding Partner',
    icon: '🤝',
    color: '#996633',
    description: 'External partner intake (e.g. Straight-in, Kular).',
    tasks: [
      { id: 'op-contract',  name: 'Send partner contract',           assignedTo: 'Olivier',     priority: 'high',   dueOffsetDays: 0 },
      { id: 'op-sign',      name: 'Collect signatures',              assignedTo: 'Olivier',     priority: 'high',   dueOffsetDays: 3 },
      { id: 'op-folder',    name: 'Create collaboration folder',     assignedTo: 'Aina Rama',   priority: 'medium', dueOffsetDays: 4 },
      { id: 'op-doc',       name: 'Share working docs',              assignedTo: 'Aina Rama',   priority: 'medium', dueOffsetDays: 4 },
      { id: 'op-meet',      name: 'Setup monthly meetings',          assignedTo: 'Aina Rama',   priority: 'medium', dueOffsetDays: 5 },
      { id: 'op-tools',     name: 'Grant tool access',               assignedTo: 'Sai',         priority: 'medium', dueOffsetDays: 5 },
      { id: 'op-comms',     name: 'Setup comms channel (Slack/etc)', assignedTo: 'Aina Rama',   priority: 'low',    dueOffsetDays: 5 },
      { id: 'op-intro',     name: 'Send introduction to team',       assignedTo: 'Olivier',     priority: 'medium', dueOffsetDays: 6 },
      { id: 'op-first',     name: 'Schedule first joint call',       assignedTo: 'Olivier',     priority: 'medium', dueOffsetDays: 7 },
    ],
  },

  {
    slug: 'end-of-project',
    label: 'End of Project',
    icon: '🏁',
    color: '#666666',
    description: 'Wind down + final billing on engagement close.',
    tasks: [
      { id: 'eop-stop',      name: 'Stop all active services',       assignedTo: null,             priority: 'high',   dueOffsetDays: 0 },
      { id: 'eop-delete',    name: 'Delete dedicated accounts',      assignedTo: null,             priority: 'medium', dueOffsetDays: 2 },
      { id: 'eop-archive',   name: 'Archive documents',              assignedTo: 'Winnie Lauren',  priority: 'medium', dueOffsetDays: 5 },
      { id: 'eop-final',     name: 'Send final invoice',             assignedTo: 'Winnie Lauren',  priority: 'high',   dueOffsetDays: 3 },
      { id: 'eop-confirm',   name: 'Confirm completion with client', assignedTo: null,             priority: 'medium', dueOffsetDays: 7 },
    ],
  },
];

export function getTemplate(slug: string): ProcessTemplate | undefined {
  return TEMPLATES.find(t => t.slug === slug);
}
