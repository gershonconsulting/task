// Process templates.
// Each project is created from one of these. Tasks are inserted into
// the tasks table at project creation time.
//
// dueOffsetDays is days from project start_date (negative = before launch).
// priority defaults to 'medium' if omitted.
// tool is the primary tool used for this task (must match a slug in TOOLS list).
//
// Template categories:
//   SETUP & LIFECYCLE  — run once per client engagement
//   MONTHLY RECURRING  — auto-created every month (Monthly Report, Facturation,
//                         + ongoing service delivery for SCC / LG / SS)
//   ONBOARDING         — one-time setup for each service (SCC / LG / SS)
//   BILLING            — finance side
//   PEOPLE & PARTNERS  — team + external partner onboarding

export type Priority = 'low' | 'medium' | 'high';

export interface TemplateTask {
  id: string;           // stable id within the template → tasks.template_item_id
  name: string;
  description?: string;
  assignedTo: string | null;
  priority?: Priority;
  dueOffsetDays?: number;
  tool?: string;        // slug from TOOLS list
}

export interface ProcessTemplate {
  slug: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  category?: string;    // display grouping in New Project picker
  tasks: TemplateTask[];
}

// Master tool list — managed via Settings > Tools
export interface Tool {
  slug: string;
  label: string;
  icon: string;
  color: string;
}

export const DEFAULT_TOOLS: Tool[] = [
  { slug: 'streak',          label: 'Streak',          icon: '📊', color: '#f97316' },
  { slug: 'chat',            label: 'Chat',             icon: '💬', color: '#6366f1' },
  { slug: 'calendar',        label: 'Calendar',         icon: '📅', color: '#0ea5e9' },
  { slug: 'xero',            label: 'Xero',             icon: '💳', color: '#13b5ea' },
  { slug: 'owlead',          label: 'Owlead',           icon: '🦉', color: '#7c3aed' },
  { slug: 'linalysis',       label: 'Linalysis',        icon: '🔎', color: '#059669' },
  { slug: 'cloudcampaign',   label: 'CloudCampaign',    icon: '📣', color: '#ec4899' },
  { slug: 'phantombuster',   label: 'PhantomBuster',    icon: '👻', color: '#8b5cf6' },
  { slug: 'kular',           label: 'Kular',            icon: '🎯', color: '#f59e0b' },
];

export const TEMPLATES: ProcessTemplate[] = [

  // ─── SETUP & LIFECYCLE ────────────────────────────────────────────────────
  {
    slug: 'client-onboarding',
    label: 'Client Onboarding',
    icon: '🎯',
    color: '#CC3333',
    description: 'Setup checklist for a new client engagement.',
    category: 'Setup & Lifecycle',
    tasks: [
      { id: 'co-xero',     name: 'Create user in Xero',                   assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 1,  tool: 'xero'   },
      { id: 'co-invoices', name: 'Create line invoices',                   assignedTo: 'Olivier',       priority: 'high',   dueOffsetDays: 2,  tool: 'xero'   },
      { id: 'co-streak-p', name: 'Create project in Streak',               assignedTo: 'Aina Rama',     priority: 'medium', dueOffsetDays: 1,  tool: 'streak' },
      { id: 'co-master',   name: 'Create master Google Doc',               assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 2                  },
      { id: 'co-streak-c', name: 'Create client in Streak',                assignedTo: 'Aina Rama',     priority: 'medium', dueOffsetDays: 1,  tool: 'streak' },
      { id: 'co-logo',     name: 'Add logo to gershonconsulting.com',      assignedTo: 'Winnie Lauren', priority: 'low',    dueOffsetDays: 5                  },
      { id: 'co-origin',   name: 'Inform origin',                          assignedTo: null,            priority: 'low',    dueOffsetDays: 3,  tool: 'chat'   },
      { id: 'co-email',    name: 'Create client@gershonconsulting.com',    assignedTo: 'Sai',           priority: 'medium', dueOffsetDays: 2                  },
    ],
  },

  {
    slug: 'end-of-project',
    label: 'End of Project',
    icon: '🏁',
    color: '#666666',
    description: 'Wind down + final billing on engagement close.',
    category: 'Setup & Lifecycle',
    tasks: [
      { id: 'eop-stop',    name: 'Stop all active services',       assignedTo: null,            priority: 'high',   dueOffsetDays: 0              },
      { id: 'eop-delete',  name: 'Delete dedicated accounts',      assignedTo: null,            priority: 'medium', dueOffsetDays: 2              },
      { id: 'eop-archive', name: 'Archive documents',              assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 5              },
      { id: 'eop-final',   name: 'Send final invoice',             assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 3, tool: 'xero'},
      { id: 'eop-confirm', name: 'Confirm completion with client', assignedTo: null,            priority: 'medium', dueOffsetDays: 7, tool: 'chat'},
    ],
  },

  // ─── MONTHLY RECURRING ────────────────────────────────────────────────────
  {
    slug: 'monthly-report',
    label: 'Monthly Report',
    icon: '📊',
    color: '#3366CC',
    description: 'End-of-month status report delivery.',
    category: 'Monthly Recurring',
    tasks: [
      { id: 'mr-verify-master',  name: 'Verify master document content',         assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 22             },
      { id: 'mr-ask-missing',    name: 'Ask team for missing info',               assignedTo: 'Aina Rama',     priority: 'medium', dueOffsetDays: 23, tool: 'chat'},
      { id: 'mr-collect-data',   name: 'Collect latest data',                     assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 25             },
      { id: 'mr-save-pdf',       name: 'Save report as PDF',                      assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 27             },
      { id: 'mr-request-comp',   name: 'Request completion from contributors',    assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 24, tool: 'chat'},
      { id: 'mr-request-up',     name: 'Request uploads',                         assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 25, tool: 'chat'},
      { id: 'mr-verify-acc',     name: 'Verify accuracy / QC pass 1',             assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 27             },
      { id: 'mr-copy-analytics', name: 'Copy data to analytics dashboard',        assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 28             },
      { id: 'mr-qc2',            name: 'Quality control pass 2',                  assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 28             },
      { id: 'mr-upload-system',  name: 'Upload to system',                        assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 29             },
      { id: 'mr-final-qc',       name: 'Final QC review',                         assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 29             },
      { id: 'mr-send-client',    name: 'Send report to client',                   assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 30, tool: 'chat'},
      { id: 'mr-confirm',        name: 'Confirm client receipt',                  assignedTo: 'Winnie Lauren', priority: 'low',    dueOffsetDays: 31, tool: 'chat'},
    ],
  },

  {
    slug: 'facturation',
    label: 'Facturation',
    icon: '💳',
    color: '#9933CC',
    description: 'Invoicing and payment collection cycle.',
    category: 'Monthly Recurring',
    tasks: [
      { id: 'fa-draft', name: 'Prepare draft invoices',    assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 1,  tool: 'xero' },
      { id: 'fa-issue', name: 'Issue final invoices',      assignedTo: 'Olivier',       priority: 'high',   dueOffsetDays: 2,  tool: 'xero' },
      { id: 'fa-r1',    name: 'Send payment reminder 1',   assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 9,  tool: 'xero' },
      { id: 'fa-r2',    name: 'Send payment reminder 2',   assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 16, tool: 'xero' },
    ],
  },

  {
    slug: 'social-content-creation',
    label: 'Social Content Creation',
    icon: '📝',
    color: '#3366CC',
    description: 'Monthly social content production via CloudCampaign.',
    category: 'Monthly Recurring',
    tasks: [
      { id: 'scc-create',   name: 'Create content on CloudCampaign',  assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 5,  tool: 'cloudcampaign' },
      { id: 'scc-approval', name: 'Send for client approval',          assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 7,  tool: 'chat'          },
      { id: 'scc-feedback', name: 'Collect feedback',                  assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 10, tool: 'chat'          },
      { id: 'scc-update',   name: 'Update based on comments',          assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 12                        },
      { id: 'scc-publish',  name: 'Publish content',                   assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 15, tool: 'cloudcampaign' },
    ],
  },

  {
    slug: 'lead-generation',
    label: 'Lead Generation',
    icon: '🎣',
    color: '#FF6600',
    description: 'Monthly B2B outbound lead gen via PhantomBuster + LinkedIn.',
    category: 'Monthly Recurring',
    tasks: [
      { id: 'lg-m-check',    name: 'Check campaign performance',     assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 3,  tool: 'phantombuster' },
      { id: 'lg-m-leads',    name: 'Export new leads',               assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 5,  tool: 'phantombuster' },
      { id: 'lg-m-qualify',  name: 'Qualify leads',                  assignedTo: 'Aina Rama',     priority: 'medium', dueOffsetDays: 7                          },
      { id: 'lg-m-streak',   name: 'Add qualified leads to Streak',  assignedTo: 'Aina Rama',     priority: 'medium', dueOffsetDays: 8,  tool: 'streak'        },
      { id: 'lg-m-report',   name: 'Monthly lead gen report',        assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 25, tool: 'chat'           },
    ],
  },

  {
    slug: 'social-selling',
    label: 'Social Selling',
    icon: '💼',
    color: '#00AA66',
    description: 'Monthly LinkedIn-based social selling activity.',
    category: 'Monthly Recurring',
    tasks: [
      { id: 'ss-m-connect',  name: 'Send connection requests',        assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 3,  tool: 'kular'   },
      { id: 'ss-m-followup', name: 'Follow up with new connections',  assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 10, tool: 'kular'   },
      { id: 'ss-m-streak',   name: 'Update Streak pipeline',          assignedTo: 'Aina Rama',     priority: 'medium', dueOffsetDays: 15, tool: 'streak'  },
      { id: 'ss-m-report',   name: 'Monthly social selling report',   assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 25, tool: 'chat'    },
    ],
  },

  // ─── ONBOARDING (one-time service setup) ─────────────────────────────────
  {
    slug: 'social-content-creation-onboarding',
    label: 'Social Content Creation — Onboarding',
    icon: '📝',
    color: '#1d4ed8',
    description: 'One-time setup for Social Content Creation service (CloudCampaign, strategy, approvals).',
    category: 'Onboarding',
    tasks: [
      { id: 'scco-strategy',  name: 'Define content strategy with client',    assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 2,  tool: 'chat'          },
      { id: 'scco-brand',     name: 'Collect brand assets (logo, colors)',     assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 3,  tool: 'chat'          },
      { id: 'scco-cloud',     name: 'Setup CloudCampaign account',             assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 4,  tool: 'cloudcampaign' },
      { id: 'scco-calendar',  name: 'Build content calendar template',         assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 5                          },
      { id: 'scco-approval',  name: 'Setup client approval workflow',          assignedTo: 'Aina Rama',     priority: 'medium', dueOffsetDays: 6,  tool: 'chat'          },
      { id: 'scco-first',     name: 'Create & send first content batch',       assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 10, tool: 'cloudcampaign' },
      { id: 'scco-fb',        name: 'Collect first feedback',                  assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 14, tool: 'chat'          },
    ],
  },

  {
    slug: 'lead-generation-onboarding',
    label: 'Lead Generation — Onboarding',
    icon: '🎣',
    color: '#c2410c',
    description: 'One-time setup for Lead Generation service (PhantomBuster, sequences, targeting).',
    category: 'Onboarding',
    tasks: [
      { id: 'lgo-start',   name: 'Start project in Streak',            assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 0,  tool: 'streak'        },
      { id: 'lgo-prep',    name: 'Initial preparation & ICP research',  assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 1                          },
      { id: 'lgo-quest',   name: 'Send questionnaire to client',        assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 2,  tool: 'chat'          },
      { id: 'lgo-doc',     name: 'Create targeting documentation',      assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 3                          },
      { id: 'lgo-infra',   name: 'Setup email infrastructure',          assignedTo: 'Sai',           priority: 'high',   dueOffsetDays: 4,  tool: 'linalysis'     },
      { id: 'lgo-phantom', name: 'Configure PhantomBuster campaign',    assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 5,  tool: 'phantombuster' },
      { id: 'lgo-test',    name: 'Run test campaign + review results',  assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 7,  tool: 'phantombuster' },
      { id: 'lgo-launch',  name: 'Launch live campaign',                assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 10, tool: 'phantombuster' },
    ],
  },

  {
    slug: 'social-selling-onboarding',
    label: 'Social Selling — Onboarding',
    icon: '💼',
    color: '#047857',
    description: 'One-time setup for Social Selling service (LinkedIn, Kular, targeting).',
    category: 'Onboarding',
    tasks: [
      { id: 'sso-start',   name: 'Start project in Streak',             assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 0,  tool: 'streak'   },
      { id: 'sso-forms',   name: 'Send forms to client',                assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 1,  tool: 'chat'     },
      { id: 'sso-review',  name: 'Review completed forms',              assignedTo: 'Aina Rama',     priority: 'medium', dueOffsetDays: 3                    },
      { id: 'sso-invoice', name: 'Send onboarding invoice',             assignedTo: 'Winnie Lauren', priority: 'medium', dueOffsetDays: 2,  tool: 'xero'     },
      { id: 'sso-kular',   name: 'Setup Kular campaign',                assignedTo: 'Winnie Lauren', priority: 'high',   dueOffsetDays: 5,  tool: 'kular'    },
      { id: 'sso-profile', name: 'Optimise LinkedIn profile',           assignedTo: 'Aina Rama',     priority: 'medium', dueOffsetDays: 4                    },
      { id: 'sso-target',  name: 'Define targeting & messaging',        assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 5,  tool: 'chat'     },
      { id: 'sso-launch',  name: 'Launch campaign',                     assignedTo: 'Aina Rama',     priority: 'high',   dueOffsetDays: 7,  tool: 'kular'    },
    ],
  },

  // ─── BILLING ─────────────────────────────────────────────────────────────
  {
    slug: 'market-research',
    label: 'Market Research',
    icon: '🔍',
    color: '#CCCC00',
    description: 'Full market research report with 3 versions and exec summary.',
    category: 'Billing',
    tasks: [
      { id: 'mres-01', name: 'Send invoice #1',                    assignedTo: null, priority: 'high',   dueOffsetDays: 0,  tool: 'xero'     },
      { id: 'mres-02', name: 'Confirm invoice #1 paid',            assignedTo: null, priority: 'high',   dueOffsetDays: 3,  tool: 'xero'     },
      { id: 'mres-03', name: 'Create Google Drive folder',         assignedTo: null, priority: 'medium', dueOffsetDays: 1                    },
      { id: 'mres-04', name: 'Collect marketing data',             assignedTo: null, priority: 'medium', dueOffsetDays: 5,  tool: 'linalysis'},
      { id: 'mres-05', name: 'Send questionnaire',                 assignedTo: null, priority: 'medium', dueOffsetDays: 2,  tool: 'chat'     },
      { id: 'mres-06', name: 'Receive questionnaire responses',    assignedTo: null, priority: 'medium', dueOffsetDays: 7,  tool: 'chat'     },
      { id: 'mres-07', name: 'Publish version #1',                 assignedTo: null, priority: 'high',   dueOffsetDays: 14                   },
      { id: 'mres-08', name: 'Quality control #1',                 assignedTo: null, priority: 'high',   dueOffsetDays: 15                   },
      { id: 'mres-09', name: 'Send version #1 to client',         assignedTo: null, priority: 'high',   dueOffsetDays: 16, tool: 'chat'     },
      { id: 'mres-10', name: 'Receive comments on version #1',    assignedTo: null, priority: 'medium', dueOffsetDays: 21, tool: 'chat'     },
      { id: 'mres-11', name: 'Send invoice #2',                    assignedTo: null, priority: 'high',   dueOffsetDays: 22, tool: 'xero'     },
      { id: 'mres-12', name: 'Confirm invoice #2 paid',            assignedTo: null, priority: 'high',   dueOffsetDays: 25, tool: 'xero'     },
      { id: 'mres-13', name: 'Publish version #2',                 assignedTo: null, priority: 'high',   dueOffsetDays: 28                   },
      { id: 'mres-14', name: 'Quality control #2',                 assignedTo: null, priority: 'high',   dueOffsetDays: 29                   },
      { id: 'mres-15', name: 'Send version #2 to client',         assignedTo: null, priority: 'high',   dueOffsetDays: 30, tool: 'chat'     },
      { id: 'mres-16', name: 'Receive comments on version #2',    assignedTo: null, priority: 'medium', dueOffsetDays: 35, tool: 'chat'     },
      { id: 'mres-17', name: 'Publish version #3',                 assignedTo: null, priority: 'high',   dueOffsetDays: 38                   },
      { id: 'mres-18', name: 'Quality control #3',                 assignedTo: null, priority: 'high',   dueOffsetDays: 39                   },
      { id: 'mres-19', name: 'Send version #3 to client',         assignedTo: null, priority: 'high',   dueOffsetDays: 40, tool: 'chat'     },
      { id: 'mres-20', name: 'Create executive summary',           assignedTo: null, priority: 'high',   dueOffsetDays: 42                   },
      { id: 'mres-21', name: "Create 'What surprised us' section", assignedTo: null, priority: 'medium', dueOffsetDays: 42                   },
      { id: 'mres-22', name: 'Create Gershon Score',               assignedTo: null, priority: 'medium', dueOffsetDays: 42, tool: 'linalysis'},
      { id: 'mres-23', name: 'Create key findings presentation',   assignedTo: null, priority: 'high',   dueOffsetDays: 44                   },
      { id: 'mres-24', name: 'Publish final version',              assignedTo: null, priority: 'high',   dueOffsetDays: 45                   },
    ],
  },

  // ─── PEOPLE & PARTNERS ───────────────────────────────────────────────────
  {
    slug: 'staff-onboarding',
    label: 'Staff Onboarding',
    icon: '🧑‍💼',
    color: '#66CCCC',
    description: 'New Gershon team member intake.',
    category: 'People & Partners',
    tasks: [
      { id: 'so-confirm',     name: 'Confirmation of hire',        assignedTo: null, priority: 'high',   dueOffsetDays: 0               },
      { id: 'so-email',       name: 'Setup email & contact',       assignedTo: null, priority: 'high',   dueOffsetDays: 1               },
      { id: 'so-access',      name: 'Provision tool access',       assignedTo: null, priority: 'high',   dueOffsetDays: 2               },
      { id: 'so-calendar',    name: 'Calendar / availability sync',assignedTo: null, priority: 'medium', dueOffsetDays: 2, tool: 'calendar'},
      { id: 'so-nda',         name: 'Send & sign NDA',             assignedTo: null, priority: 'high',   dueOffsetDays: 1, tool: 'chat'  },
      { id: 'so-video',       name: 'Send onboarding video',       assignedTo: null, priority: 'medium', dueOffsetDays: 1, tool: 'chat'  },
      { id: 'so-tools-streak',name: 'Train on Streak',             assignedTo: null, priority: 'medium', dueOffsetDays: 3, tool: 'streak'},
      { id: 'so-tools-snov',  name: 'Train on Snov.io',            assignedTo: null, priority: 'medium', dueOffsetDays: 3               },
      { id: 'so-intro',       name: 'Team introduction',           assignedTo: null, priority: 'medium', dueOffsetDays: 5, tool: 'chat'  },
      { id: 'so-first-task',  name: 'Assign first project task',   assignedTo: null, priority: 'medium', dueOffsetDays: 7, tool: 'streak'},
      { id: 'so-checkin',     name: '2-week check-in',             assignedTo: null, priority: 'medium', dueOffsetDays: 14,tool: 'calendar'},
    ],
  },

  {
    slug: 'onboarding-partner',
    label: 'Onboarding Partner',
    icon: '🤝',
    color: '#996633',
    description: 'External partner intake (e.g. Straight-in, Kular).',
    category: 'People & Partners',
    tasks: [
      { id: 'op-contract', name: 'Send partner contract',           assignedTo: 'Olivier',   priority: 'high',   dueOffsetDays: 0, tool: 'chat'    },
      { id: 'op-sign',     name: 'Collect signatures',              assignedTo: 'Olivier',   priority: 'high',   dueOffsetDays: 3                   },
      { id: 'op-folder',   name: 'Create collaboration folder',     assignedTo: 'Aina Rama', priority: 'medium', dueOffsetDays: 4                   },
      { id: 'op-doc',      name: 'Share working docs',              assignedTo: 'Aina Rama', priority: 'medium', dueOffsetDays: 4, tool: 'chat'     },
      { id: 'op-meet',     name: 'Setup monthly meetings',          assignedTo: 'Aina Rama', priority: 'medium', dueOffsetDays: 5, tool: 'calendar' },
      { id: 'op-tools',    name: 'Grant tool access',               assignedTo: 'Sai',       priority: 'medium', dueOffsetDays: 5                   },
      { id: 'op-comms',    name: 'Setup comms channel (Slack/etc)', assignedTo: 'Aina Rama', priority: 'low',    dueOffsetDays: 5, tool: 'chat'     },
      { id: 'op-intro',    name: 'Send introduction to team',       assignedTo: 'Olivier',   priority: 'medium', dueOffsetDays: 6, tool: 'chat'     },
      { id: 'op-first',    name: 'Schedule first joint call',       assignedTo: 'Olivier',   priority: 'medium', dueOffsetDays: 7, tool: 'calendar' },
    ],
  },
];

export function getTemplate(slug: string): ProcessTemplate | undefined {
  return TEMPLATES.find(t => t.slug === slug);
}

// Personal templates
export const PERSONAL_TEMPLATES: ProcessTemplate[] = [
  { slug: 'personal-move', label: 'Move', icon: '📦', color: '#7C3AED', description: 'Personal relocation checklist.', tasks: [
    { id: 'move-01', name: 'Find new place',     assignedTo: null, priority: 'high',   dueOffsetDays: 0  },
    { id: 'move-02', name: 'Book movers',        assignedTo: null, priority: 'high',   dueOffsetDays: 7  },
    { id: 'move-03', name: 'Pack boxes',         assignedTo: null, priority: 'medium', dueOffsetDays: 14 },
    { id: 'move-04', name: 'Notify utilities',   assignedTo: null, priority: 'medium', dueOffsetDays: 10 },
    { id: 'move-05', name: 'Update address',     assignedTo: null, priority: 'medium', dueOffsetDays: 12 },
    { id: 'move-06', name: 'Moving day',         assignedTo: null, priority: 'high',   dueOffsetDays: 21 },
  ]},
  { slug: 'personal-trip', label: 'Trip', icon: '✈️', color: '#0EA5E9', description: 'Travel planning checklist.', tasks: [
    { id: 'trip-01', name: 'Choose destination',     assignedTo: null, priority: 'high',   dueOffsetDays: 0  },
    { id: 'trip-02', name: 'Book flights',           assignedTo: null, priority: 'high',   dueOffsetDays: 1  },
    { id: 'trip-03', name: 'Book accommodation',     assignedTo: null, priority: 'high',   dueOffsetDays: 2  },
    { id: 'trip-04', name: 'Check passport / visa',  assignedTo: null, priority: 'high',   dueOffsetDays: 1  },
    { id: 'trip-05', name: 'Pack',                   assignedTo: null, priority: 'medium', dueOffsetDays: 14 },
  ]},
  { slug: 'personal-generic', label: 'Personal project', icon: '🎯', color: '#10B981', description: 'Generic personal project.', tasks: [
    { id: 'gen-01', name: 'Define goal', assignedTo: null, priority: 'high',   dueOffsetDays: 0 },
    { id: 'gen-02', name: 'Research',    assignedTo: null, priority: 'medium', dueOffsetDays: 3 },
    { id: 'gen-03', name: 'Execute',     assignedTo: null, priority: 'high',   dueOffsetDays: 7 },
  ]},
];

export const ALL_TEMPLATES = [...TEMPLATES, ...PERSONAL_TEMPLATES];
export function isPersonalTemplate(slug: string): boolean { return slug.startsWith('personal-'); }

// Which template slugs are auto-created every month for every client
export const MONTHLY_TEMPLATE_SLUGS = [
  'monthly-report',
  'facturation',
  'social-content-creation',
  'lead-generation',
  'social-selling',
];
