export const REGISTRATION_URL =
  'https://reminiscent-ironclad-759.notion.site/5a804e699d9c46d1a0bcecaceeae6894?pvs=105';

export const programStages = [
  {
    id: 'developer-hunt',
    title: 'Developer hunt & orientation',
    date: '2026-10-26',
    dateLabel: 'Oct 26, 2026 · 1–5 PM',
    description:
      'Meet the initiative, the community, and the shared mission behind DAGITAB.',
  },
  {
    id: 'lgu-briefing',
    title: 'Partner LGU & organization meeting',
    date: '2026-10-30',
    dateLabel: 'Oct 30, 2026 · time TBA',
    description:
      'Identify the city’s highest priorities with LGU partners and agree which needs the platform should address first.',
  },
  {
    id: 'architecture',
    title: 'System architecture workshop',
    date: '2026-11-13',
    dateLabel: 'Nov 13, 2026 · time TBA',
    description:
      'Shape a shared architecture and APIs around the city’s agreed priorities and selected services.',
  },
  {
    id: 'team-formation',
    title: 'Module team formation',
    date: '2026-11-13',
    dateLabel: 'Nov 13, 2026 · time TBA',
    description:
      'Form cross-organization teams around the city’s priority needs and the skills the agreed scope requires.',
  },
  {
    id: 'development-sprint',
    title: 'Development sprint',
    date: '2026-11-20',
    dateLabel: 'Nov 20, 2026 · time TBA',
    description:
      'Build your module with mentor support and bring your progress to a shared checkpoint.',
  },
  {
    id: 'integration',
    title: 'Integration day',
    date: null,
    dateLabel: 'Date to be announced',
    description:
      'Bring every module together. Merge, debug, and connect the work into one running system.',
  },
  {
    id: 'user-testing',
    title: 'User acceptance testing',
    date: null,
    dateLabel: 'Date to be announced',
    description:
      'Let LGU partner staff test real workflows and use their feedback to refine the platform.',
  },
  {
    id: 'showcase',
    title: 'Unified system showcase',
    date: null,
    dateLabel: 'Date to be announced',
    description:
      'Present one collective demo to LGU officials, faculty, and partner organizations.',
  },
  {
    id: 'turnover',
    title: 'Deployment & turnover',
    date: null,
    dateLabel: 'Date to be announced',
    description:
      'Hand over the system, source code, and documentation to the LGU partner for a pilot rollout.',
  },
];

export const modules = [
  {
    title: 'System architecture',
    category: 'THE FOUNDATION',
    description:
      'Define the shared architecture and API specifications that keep every module connected.',
    icon: 'Network',
  },
  {
    title: 'Citizen digital ID',
    category: 'IDENTITY & ACCESS',
    description:
      'Build citizen authentication and digital identity for the shared platform.',
    icon: 'Fingerprint',
  },
  {
    title: 'Permits & registration',
    category: 'BUSINESS SERVICES',
    description:
      'Create a module for permit processing and business registration workflows.',
    icon: 'FileCheck2',
  },
  {
    title: 'Citizen reports',
    category: 'COMMUNITY FEEDBACK',
    description:
      'Help citizens raise concerns and track complaints through a connected reporting module.',
    icon: 'MessageSquare',
  },
  {
    title: 'Community alerts',
    category: 'DISASTER & ADVISORIES',
    description:
      'Develop a module for disaster alerts and community advisories.',
    icon: 'Radio',
  },
  {
    title: 'Local discovery',
    category: 'TOURISM & INFORMATION',
    description:
      'Connect people with tourism and local information through the unified platform.',
    icon: 'MapPin',
  },
  {
    title: 'LGU dashboard',
    category: 'ADMINISTRATION',
    description:
      'Give LGU staff an administrative workspace for the shared system.',
    icon: 'LayoutDashboard',
  },
  {
    title: 'Quality & security',
    category: 'QA & DOCUMENTATION',
    description:
      'Support testing, security, and documentation across the work of every module team.',
    icon: 'ShieldCheck',
  },
];

export const faqs = [
  {
    question: 'Is DAGITAB a competition?',
    answer:
      'DAGITAB is a collaborative system-building initiative. Everyone contributes to one shared e-governance platform, with cross-organization teams owning different modules. There are no competing entries or cash prizes.',
  },
  {
    question: 'Who is the developer hunt for?',
    answer:
      'The initiative brings together students from Computer Engineering, Information Technology, Computer Science, and allied tech organizations. Students from Batangas State University, Lyceum of the Philippines University–Batangas, and the University of Batangas are invited to explore the shared mission. Final participation requirements are subject to CURSOR’s announcements.',
  },
  {
    question: 'What are we actually building?',
    answer:
      'One integrated e-governance platform for Batangas City. Final modules and development order will follow the highest priorities identified by the city. The work areas shown are examples, not a fixed list or limit. Teams will agree the scope with the city and CURSOR, then build, test, and integrate the selected services for a pilot rollout.',
  },
  {
    question: 'When and where will it happen?',
    answer:
      'The program document lists November 2026 to May 2027 and an online format, with preparatory activities scheduled in October. Integration Day is described as a joint gathering; its venue and the dates of the final phases are still to be announced. Published dates are planned milestones, not confirmation that a session has taken place.',
  },
  {
    question: 'Do I need to be an experienced developer?',
    answer:
      'The program document does not specify a minimum experience level. Teams are formed around modules and skills, with mentor-supported development sessions. CURSOR will need to confirm any skill prerequisites and available roles.',
  },
  {
    question: 'What commitment should I expect?',
    answer:
      'Expect shared architecture work, scheduled development sprints, progress checkpoints, and integration with other teams. If you cannot attend an assigned sprint, notify your module lead and mentor in advance and catch up through the shared tracker. Coordinate delayed deliverables before Integration Day.',
  },
  {
    question: 'How do I join?',
    answer:
      'Use the developer sign-up link to open CURSOR’s registration page on Notion and complete the form there. Check the form and CURSOR’s official announcements for current joining requirements and any application deadline.',
  },
];

export const schools = [
  'Batangas State University',
  'Lyceum of the Philippines University–Batangas',
  'University of Batangas',
];
