import { useEffect, useState } from 'react';
import './App.css';

/* ------------------------------------------------------------------ */
/* Identity lifecycle ring (illustrative sample journeys)              */
/* ------------------------------------------------------------------ */

type SystemId = 'hr' | 'dir' | 'apps' | 'itsm' | 'audit';

// Categories rather than products, so the ring shows the shape of the work.
// Inner nodes sit between the stage markers on the outer ring.
const systems: { id: SystemId; abbr: string; label: string; examples: string; angle: number }[] = [
  { id: 'hr', abbr: 'HR', label: 'HR source', examples: 'Authoritative feed that starts every joiner, mover, and leaver', angle: -54 },
  { id: 'dir', abbr: 'DIR', label: 'Directories', examples: 'Active Directory, Entra ID', angle: 18 },
  { id: 'apps', abbr: 'APPS', label: 'Applications', examples: '120+ connected: JDBC, Oracle EBS, Salesforce, SCIM, REST, GitHub', angle: 90 },
  { id: 'itsm', abbr: 'ITSM', label: 'Ticketing', examples: 'ServiceNow, Cherwell: requests, approvals, manual work', angle: 162 },
  { id: 'audit', abbr: 'AUDIT', label: 'Audit & analytics', examples: 'Point-in-time reporting, certifications, audit trail', angle: 234 },
];

const STAGES = ['Onboarding', 'Access & RBAC', 'Access request', 'Transfer', 'Offboarding'];

// added: granted at this stage. kept: carried over. removed: taken away at this
// stage. eligible: allowed to ask for it, but not holding it.
type AccessState = 'added' | 'kept' | 'removed' | 'eligible';
type AccessItem = { system: SystemId; label: string; state: AccessState; note?: string };
type Stage = { headline: string; detail: string; pace: string; access: AccessItem[] };
type Journey = { id: string; tab: string; name: string; kind: string; badge: string; stages: Stage[] };

const journeys: Journey[] = [
  {
    id: 'employee',
    tab: 'Employee',
    name: 'Ana Reyes',
    kind: 'Platform Engineer',
    badge: 'AR',
    stages: [
      {
        headline: 'The HR record creates the identity',
        detail: 'The HR feed creates Ana before her start date and her directory accounts are built automatically. Nobody files a ticket.',
        pace: 'Ready before day one',
        access: [
          { system: 'hr', label: 'HR record', state: 'added' },
          { system: 'dir', label: 'AD and Entra ID accounts', state: 'added' },
          { system: 'audit', label: 'Joiner event recorded', state: 'added' },
        ],
      },
      {
        headline: 'Her role grants birthright access',
        detail: 'The Platform Engineer role assigns the groups and application access everyone in that job gets. Roles, not one-off grants, so access can be reviewed by role.',
        pace: 'Assigned by role, not by request',
        access: [
          { system: 'dir', label: 'Platform-Eng group', state: 'added' },
          { system: 'apps', label: 'GitHub team, M365 license', state: 'added' },
          { system: 'hr', label: 'HR record', state: 'kept' },
          { system: 'audit', label: 'Role assignment recorded', state: 'added' },
        ],
      },
      {
        headline: 'She asks for something extra',
        detail: 'Ana requests production database access. Her manager approves the ticket, the reason is recorded, and the access is provisioned.',
        pace: 'Approved in hours, with a record',
        access: [
          { system: 'itsm', label: 'Request and approval', state: 'added' },
          { system: 'apps', label: 'Production database', state: 'added' },
          { system: 'dir', label: 'Platform-Eng group', state: 'kept' },
          { system: 'audit', label: 'Who approved, and why', state: 'added' },
        ],
      },
      {
        headline: 'She moves to the Security team',
        detail: 'The HR change brings Security access and removes Platform access in the same step. Her new manager gets a review of anything she kept.',
        pace: 'Old access out the same day',
        access: [
          { system: 'hr', label: 'Department change', state: 'added' },
          { system: 'dir', label: 'Security-Analysts group', state: 'added' },
          { system: 'dir', label: 'Platform-Eng group', state: 'removed' },
          { system: 'apps', label: 'Production database', state: 'removed' },
          { system: 'audit', label: 'Transfer review for new manager', state: 'added' },
        ],
      },
      {
        headline: 'She leaves the company',
        detail: 'Connected systems are disabled together. Applications that cannot be automated get a deprovisioning ticket, so nothing is missed.',
        pace: 'All access off within minutes',
        access: [
          { system: 'hr', label: 'Termination', state: 'added' },
          { system: 'dir', label: 'AD and Entra ID accounts', state: 'removed' },
          { system: 'apps', label: 'All application access', state: 'removed' },
          { system: 'itsm', label: 'Tickets for manual apps', state: 'added' },
          { system: 'audit', label: 'Leaver report', state: 'added' },
        ],
      },
    ],
  },
  {
    id: 'service',
    tab: 'Service account',
    name: 'svc-deploy-bot',
    kind: 'Non-human identity · GitHub App',
    badge: 'SVC',
    stages: [
      {
        headline: 'Registered with a purpose and an owner',
        detail: 'No HR record exists for a service account, so a request names what it is for and who answers for it. No owner, no account.',
        pace: 'Owner assigned at creation',
        access: [
          { system: 'itsm', label: 'Registration request', state: 'added' },
          { system: 'apps', label: 'GitHub App identity', state: 'added' },
          { system: 'audit', label: 'Owner on record', state: 'added' },
        ],
      },
      {
        headline: 'Scoped to its one job',
        detail: 'A role gives it write on the two repositories it deploys, and nothing else.',
        pace: 'Least privilege from the start',
        access: [
          { system: 'apps', label: 'write on tide-api', state: 'added' },
          { system: 'apps', label: 'write on docs-site', state: 'added' },
          { system: 'audit', label: 'Owner on record', state: 'kept' },
        ],
      },
      {
        headline: 'It needs one more repository',
        detail: 'Its owner requests a third repository. The access is approved with an end date, and the key keeps rotating on schedule.',
        pace: 'Approved with an expiry',
        access: [
          { system: 'itsm', label: 'Request with end date', state: 'added' },
          { system: 'apps', label: 'write on billing-service', state: 'added', note: 'until Dec 31' },
          { system: 'apps', label: 'write on tide-api, docs-site', state: 'kept' },
        ],
      },
      {
        headline: 'Its owner changes teams',
        detail: "The owner's HR transfer triggers a handoff. Ownership passes to a named successor the same day, so the account is never orphaned.",
        pace: 'Never left without an owner',
        access: [
          { system: 'hr', label: "Owner's transfer", state: 'added' },
          { system: 'apps', label: 'Repository access', state: 'kept' },
          { system: 'audit', label: 'Ownership reassigned', state: 'added' },
        ],
      },
      {
        headline: 'The pipeline is retired',
        detail: 'Its key is revoked, its access is removed, and the identity is deleted. Nothing is left to be found later.',
        pace: 'Key revoked, identity deleted',
        access: [
          { system: 'itsm', label: 'Retirement request', state: 'added' },
          { system: 'apps', label: 'All repository access', state: 'removed' },
          { system: 'apps', label: 'GitHub App identity', state: 'removed' },
          { system: 'audit', label: 'Key revocation recorded', state: 'added' },
        ],
      },
    ],
  },
  {
    id: 'agent',
    tab: 'AI agent',
    name: 'On-call Copilot',
    kind: 'AI agent · acts for an engineer',
    badge: 'AI',
    stages: [
      {
        headline: 'Registered with an owner and a sponsor',
        detail: 'The agent is recorded with its owner, the engineer it acts for, and what it is built on: model, framework, and version.',
        pace: 'Registered before its first run',
        access: [
          { system: 'itsm', label: 'Registration request', state: 'added' },
          { system: 'audit', label: 'Model, framework, version', state: 'added' },
        ],
      },
      {
        headline: 'A role sets its ceiling',
        detail: 'Its role lists what it may ask for. It holds none of it until a task needs it, and it can never exceed its sponsor.',
        pace: '0 hours of standing access',
        access: [
          { system: 'apps', label: 'infra-terraform', state: 'eligible' },
          { system: 'dir', label: 'read prod resources', state: 'eligible' },
        ],
      },
      {
        headline: 'Just-in-time access for one task',
        detail: 'During an incident it requests write on infra-terraform. Its sponsor approves, and the access expires by itself. A second token works once and is then dead.',
        pace: '15 minutes, then gone',
        access: [
          { system: 'itsm', label: 'Sponsor approval', state: 'added' },
          { system: 'apps', label: 'write on infra-terraform', state: 'added', note: '15 min' },
          { system: 'dir', label: 'read prod resources', state: 'added', note: 'one use' },
          { system: 'audit', label: 'Every action logged', state: 'added' },
        ],
      },
      {
        headline: 'Its model or sponsor changes',
        detail: 'A new model version, or a sponsor transfer from HR, pauses the agent until its access is reviewed again.',
        pace: 'Reviewed on change, not on a calendar',
        access: [
          { system: 'hr', label: "Sponsor's transfer", state: 'added' },
          { system: 'apps', label: 'infra-terraform', state: 'eligible', note: 'paused' },
          { system: 'dir', label: 'read prod resources', state: 'eligible', note: 'paused' },
          { system: 'audit', label: 'Re-review triggered', state: 'added' },
        ],
      },
      {
        headline: 'Disabled in one step',
        detail: 'One switch revokes every live token and blocks new requests. Its activity trail is kept for audit.',
        pace: 'Off in seconds',
        access: [
          { system: 'apps', label: 'infra-terraform', state: 'removed' },
          { system: 'dir', label: 'read prod resources', state: 'removed' },
          { system: 'audit', label: 'Trail kept for audit', state: 'kept' },
        ],
      },
    ],
  },
];

const RING = { cx: 280, cy: 212, r: 150 };
const CIRCUMFERENCE = 2 * Math.PI * RING.r;
const polar = (angle: number, radius: number) => ({
  x: RING.cx + radius * Math.cos((angle * Math.PI) / 180),
  y: RING.cy + radius * Math.sin((angle * Math.PI) / 180),
});
const STATE_LABEL: Record<AccessState, string> = { added: 'Granted', kept: 'Kept', removed: 'Removed', eligible: 'Can request' };

function LifecycleRing() {
  const [journey, setJourney] = useState<Journey>(journeys[0]);
  const [stageIndex, setStageIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const stage = journey.stages[stageIndex];
  const last = STAGES.length - 1;

  // Play walks the ring one stage at a time and stops at offboarding.
  useEffect(() => {
    if (!playing) return;
    if (stageIndex >= last) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStageIndex((i: number) => i + 1), 2600);
    return () => window.clearTimeout(timer);
  }, [playing, stageIndex, last]);

  const goTo = (index: number) => {
    setPlaying(false);
    setStageIndex(index);
  };
  const pick = (next: Journey) => {
    setPlaying(false);
    setJourney(next);
    setStageIndex(0);
  };
  const togglePlay = () => {
    if (!playing && stageIndex >= last) setStageIndex(0);
    setPlaying(!playing);
  };

  // A system is "live" when the identity holds access there at this stage.
  const systemState = (id: SystemId): 'live' | 'eligible' | 'off' => {
    const items = stage.access.filter((a: AccessItem) => a.system === id);
    if (items.some((a: AccessItem) => a.state === 'added' || a.state === 'kept')) return 'live';
    if (items.some((a: AccessItem) => a.state === 'eligible')) return 'eligible';
    return 'off';
  };

  return (
    <div className="graph-card">
      <div className="graph-head">
        <span className="mono">IDENTITY LIFECYCLE · ILLUSTRATION</span>
        <button className="ring-play mono" onClick={togglePlay}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
      </div>

      <div className="identity-tabs" role="tablist" aria-label="Identity type">
        {journeys.map((j) => (
          <button
            key={j.id}
            role="tab"
            aria-selected={journey.id === j.id}
            className={`identity-tab ${journey.id === j.id ? 'is-active' : ''}`}
            onClick={() => pick(j)}
          >
            {j.tab}
          </button>
        ))}
      </div>

      <svg className="graph" viewBox="0 0 560 424" role="group" aria-label={`Lifecycle of ${journey.name}`}>
        <circle className="ring-track" cx={RING.cx} cy={RING.cy} r={RING.r} />
        <circle
          className="ring-progress"
          cx={RING.cx} cy={RING.cy} r={RING.r}
          strokeDasharray={`${(stageIndex / STAGES.length) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${RING.cx} ${RING.cy})`}
        />

        {systems.map((s) => {
          const at = polar(s.angle, 86);
          const state = systemState(s.id);
          return (
            <g key={s.id} className={`ring-system is-${state}`}>
              <line x1={RING.cx} y1={RING.cy} x2={at.x} y2={at.y} />
              <circle cx={at.x} cy={at.y} r="25" />
              <text x={at.x} y={at.y + 4} textAnchor="middle">{s.abbr}</text>
              <title>{s.label}</title>
            </g>
          );
        })}

        <g className={`ring-core ${stageIndex === last ? 'is-off' : ''}`}>
          <circle cx={RING.cx} cy={RING.cy} r="32" />
          <text x={RING.cx} y={RING.cy + 5} textAnchor="middle">{journey.badge}</text>
        </g>

        {STAGES.map((label, i) => {
          const angle = -90 + i * 72;
          const at = polar(angle, RING.r);
          const side = Math.cos((angle * Math.PI) / 180);
          const anchor = Math.abs(side) < 0.2 ? 'middle' : side > 0 ? 'start' : 'end';
          const labelAt = { x: at.x + (anchor === 'middle' ? 0 : side > 0 ? 26 : -26), y: anchor === 'middle' ? at.y - 28 : at.y + 4 };
          const status = i === stageIndex ? 'is-current' : i < stageIndex ? 'is-done' : '';
          return (
            <g
              key={label}
              className={`ring-stage ${status}`}
              role="button"
              tabIndex={0}
              aria-label={`Stage ${i + 1}: ${label}`}
              aria-pressed={i === stageIndex}
              onClick={() => goTo(i)}
              onKeyDown={(e: { key: string; preventDefault: () => void }) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  goTo(i);
                }
              }}
            >
              <circle cx={at.x} cy={at.y} r="26" className="ring-hit" />
              <circle cx={at.x} cy={at.y} r="17" className="ring-node" />
              <text x={at.x} y={at.y + 4} textAnchor="middle" className="ring-number">{i + 1}</text>
              <text x={labelAt.x} y={labelAt.y} textAnchor={anchor} className="ring-label">{label}</text>
            </g>
          );
        })}
      </svg>

      <ul className="ring-legend" aria-label="Systems involved at this stage">
        {systems.map((s) => (
          <li key={s.id} className={`is-${systemState(s.id)}`} title={s.examples}>
            <span className="legend-dot" aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>

      <div className="ring-detail" aria-live="polite">
        <p className="mono ring-step">STAGE {stageIndex + 1} OF {STAGES.length} · {STAGES[stageIndex].toUpperCase()} · {journey.name}</p>
        <p className="detail-name">{stage.headline}</p>
        <p className="ring-text">{stage.detail}</p>
        <ul className="access-chips">
          {stage.access.length === 0 && <li className="chip-none">No access yet</li>}
          {stage.access.map((a: AccessItem) => (
            <li key={`${a.system}-${a.label}`} className={`chip-${a.state}`}>
              <span className="chip-state">{STATE_LABEL[a.state]}</span>
              <span className="access-label">{a.label}</span>
              {a.note && <em>{a.note}</em>}
            </li>
          ))}
        </ul>
        <div className="ring-foot">
          <span className="ring-pace">{stage.pace}</span>
          <span className="ring-nav">
            <button onClick={() => goTo(Math.max(0, stageIndex - 1))} disabled={stageIndex === 0} aria-label="Previous stage">←</button>
            <button onClick={() => goTo(Math.min(last, stageIndex + 1))} disabled={stageIndex === last} aria-label="Next stage">→</button>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Project visuals (swap for real screenshots when you have them)      */
/* ------------------------------------------------------------------ */

function AquaSiteVisual() {
  const stations = [[92, 70], [210, 52], [330, 96], [150, 150], [292, 178]];
  return (
    <svg className="visual" viewBox="0 0 440 260" role="img" aria-label="Illustration of the AquaSite siting map">
      <defs>
        <linearGradient id="water" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" className="water-top" />
          <stop offset="1" className="water-bottom" />
        </linearGradient>
      </defs>
      <rect width="440" height="260" fill="url(#water)" />
      {[40, 80, 120, 160, 200, 240].map((y) => <path key={y} d={`M0 ${y} Q110 ${y - 8} 220 ${y} T440 ${y}`} className="contour" />)}
      <path d="M0 200 C60 185 90 215 140 205 S220 170 260 196 S330 236 380 214 S430 200 440 205 V260 H0Z" className="land" />
      <path d="M318 0 C330 30 362 40 380 70 S420 90 440 82 V0Z" className="land" />
      <path d="M178 96 L246 84 L262 132 L196 146Z" className="site" />
      <g className="score">
        <rect x="262" y="118" width="96" height="34" rx="4" />
        <text x="272" y="133" className="score-label">SITE SCORE</text>
        <text x="272" y="146" className="score-value">82 / 100</text>
      </g>
      {stations.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="9" className="station-pulse" style={{ animationDelay: `${i * 0.4}s` }} />
          <circle cx={x} cy={y} r="3.5" className="station" />
        </g>
      ))}
      <text x="14" y="22" className="map-caption">NOAA CO-OPS · ERDDAP</text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* identity-mcp replay: recorded tool output from the sample org       */
/* ------------------------------------------------------------------ */

type ReplayStep = { call: string; result: string[] };
type Replay = { id: string; question: string; steps: ReplayStep[]; answer: string };

// Tool calls and results are copied from real runs of the server against its
// sample data. Replace each `answer` with what Claude actually replied once
// you have recorded a session.
const replays: Replay[] = [
  {
    id: 'admin',
    question: 'Who has admin on billing-service?',
    steps: [
      {
        call: 'who_can_access_repo(repository: "billing-service", minimum_role: "admin")',
        result: ['Linh Nguyen   admin   via team:platform-admins', 'Priya Green   admin   via direct'],
      },
      {
        call: 'recent_changes(identity: "pgreen", days: 7)',
        result: ['2026-10-27  repo_access_granted  by mokafor', '"Direct admin on billing-service granted for the quarter-end audit"'],
      },
    ],
    answer: 'Two people. Linh Nguyen has admin through the platform-admins team. Priya Green has it through a direct grant, added on October 27 for the quarter-end audit. Direct grants skip team review, so that one should come off when the audit ends.',
  },
  {
    id: 'orphans',
    question: 'Which non-human identities have no owner?',
    steps: [
      {
        call: 'list_non_human_identities(unowned_only: true)',
        result: [
          'agent-helpdesk      owner terminated 2026-09-30   Account Operators',
          'ci-legacy-token     owner terminated 2026-09-30   admin:org token scope',
          'svc-backup          owner terminated 2026-09-30   Backup Operators',
          'svc-metrics-export  no owner ever assigned        unused 232 days',
        ],
      },
    ],
    answer: 'Four. Three belonged to Jonas Brandt, who left on September 30, and all three hold privileged access, including the Helpdesk Agent, an AI agent that resets passwords on its own. svc-metrics-export never had an owner and has not been used in 232 days.',
  },
  {
    id: 'leaver',
    question: 'Does anyone who left still have access?',
    steps: [
      {
        call: 'list_governance_findings(kind: "leaver_with_active_access")',
        result: ['CRITICAL  Jonas Brandt, terminated 2026-09-30', 'github account jonas-brandt still enabled, signed in 2026-10-14'],
      },
      {
        call: 'recent_changes(identity: "jbrandt", days: 60)',
        result: ['2026-10-01  deprovisioning_failed', '"left enabled: it owns the token ci-legacy-token, which CI still uses"'],
      },
    ],
    answer: 'Yes, one. Jonas Brandt left on September 30, but his GitHub account is still enabled and signed in two weeks later. Offboarding skipped it because the account owns ci-legacy-token, which CI still depends on. Move that token to an owned service identity, then disable the account.',
  },
];

function McpReplay() {
  const [selected, setSelected] = useState<Replay>(replays[0]);
  const [run, setRun] = useState(0);
  const lastStage = selected.steps.length * 2 + 1;
  const [stage, setStage] = useState(0);

  // Reveal the conversation one beat at a time: question, call, result, ..., answer.
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setStage(lastStage);
      return;
    }
    setStage(0);
    let current = 0;
    const timer = window.setInterval(() => {
      current += 1;
      setStage(current);
      if (current >= lastStage) window.clearInterval(timer);
    }, 700);
    return () => window.clearInterval(timer);
  }, [selected, run, lastStage]);

  return (
    <div className="replay">
      <div className="replay-head">
        <span className="mono">REPLAY · REAL TOOL OUTPUT · SAMPLE DATA</span>
        <button className="replay-again mono" onClick={() => setRun((n: number) => n + 1)}>↻ Replay</button>
      </div>

      <div className="replay-questions" role="tablist" aria-label="Example questions">
        {replays.map((r) => (
          <button
            key={r.id}
            role="tab"
            aria-selected={selected.id === r.id}
            className={`replay-q ${selected.id === r.id ? 'is-active' : ''}`}
            onClick={() => setSelected(r)}
          >
            {r.question}
          </button>
        ))}
      </div>

      <div className="replay-thread" aria-live="polite">
        <p className="bubble-user">{selected.question}</p>

        {selected.steps.map((step: ReplayStep, i: number) => {
          const called = stage >= i * 2 + 1;
          const returned = stage >= i * 2 + 2;
          if (!called) return null;
          return (
            <div className="tool-call" key={step.call}>
              <div className="tool-call-head">
                <span className={`tool-status ${returned ? 'is-done' : ''}`} aria-hidden="true" />
                <code>{step.call}</code>
              </div>
              {returned && <pre>{step.result.join('\n')}</pre>}
            </div>
          );
        })}

        {stage >= lastStage && (
          <div className="bubble-claude">
            <span className="mono">CLAUDE</span>
            <p>{selected.answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Project visuals for the ISC repos                                     */
/* ------------------------------------------------------------------ */

function TransformVisual() {
  return (
    <div className="code-visual" role="img" aria-label="An ISC transform and its offline test results">
      <pre className="code-json">{`{
  "name": "Lifecycle State - From HR Status",
  "type": "lookup",
  "attributes": {
    "input": { "type": "upper", ... },
    "table": {
      "P": "prehire", "A": "active",
      "L": "leave",   "T": "inactive",
      "default": "inactive"
    }
  }
}`}</pre>
      <pre className="code-run">{`$ isc-transforms test
checked 7 transforms, 0 problem(s)
ok   Lifecycle State: active
ok   Lifecycle State: unknown status fails closed
ok   Username: hyphen and apostrophe are removed
...
19 passed, 0 failed`}</pre>
    </div>
  );
}

function ReviewVisual() {
  const rows = [
    { who: 'Jonas Brandt', what: 'GitHub account · used after leaving', rec: 'revoke' },
    { who: 'Hassan Ali', what: 'Domain Admins · unused 134 days', rec: 'revoke' },
    { who: 'Dev Patel', what: 'tide-api write · from old team', rec: 'modify' },
    { who: 'Ana Reyes', what: 'Platform-Eng · birthright, in use', rec: 'keep' },
  ];
  return (
    <div className="review-visual" role="img" aria-label="An access review queue with recommendations">
      <p className="mono review-head">MANAGER REVIEW · 32 ITEMS · 10 NEED ATTENTION</p>
      {rows.map((r) => (
        <div className="review-row" key={r.who}>
          <div>
            <strong>{r.who}</strong>
            <span>{r.what}</span>
          </div>
          <em className={`rec rec-${r.rec}`}>{r.rec}</em>
        </div>
      ))}
      <p className="mono review-foot">OVERRIDES NEED A COMMENT · NO “APPROVE ALL”</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Content                                                              */
/* ------------------------------------------------------------------ */

const EMAIL = 'petersenpdx@gmail.com';
const GITHUB = 'https://github.com/petersenpdx';

const certifications = [
  { name: 'SailPoint Certified IdentityIQ Engineer', status: 'earned' },
  { name: 'SailPoint Certified ISC Administrator', status: 'earned' },
  { name: 'Claude Certified Architect – Foundations', status: 'in progress' },
];

const projects = [
  {
    id: 'identity-mcp',
    flip: true,
    tag: 'OPEN SOURCE · ISC APIS · AI AGENTS',
    title: 'identity-mcp',
    blurb: 'An MCP server that lets Claude answer governance questions about people, service accounts, and AI agents. It reads a SailPoint Identity Security Cloud tenant through the ISC Search API, keeps a passport for every AI agent (owner, sponsor, model, access, activity), and flags leavers, orphaned identities, and agents with more access than their sponsor. Read-only, with no tool that can change access.',
    stack: ['Python', 'ISC Search API', 'Model Context Protocol', 'Claude', '54 tests'],
    links: [{ label: 'GitHub', href: `${GITHUB}/identity-mcp` }],
    Visual: McpReplay,
  },
  {
    id: 'isc-transforms',
    flip: false,
    tag: 'OPEN SOURCE · ISC TRANSFORMS',
    title: 'isc-transforms',
    blurb: 'Identity profile transforms for ISC (usernames, email, department, lifecycle state) kept as reviewable JSON, with an offline checker and test runner so transform logic is tested in CI before it reaches a tenant. Unknown lifecycle codes fail closed to inactive.',
    stack: ['ISC transforms', 'Python', 'GitHub Actions', '19 test cases'],
    links: [{ label: 'GitHub', href: `${GITHUB}/isc-transforms` }],
    Visual: TransformVisual,
  },
  {
    id: 'access-review',
    flip: true,
    tag: 'OPEN SOURCE · CERTIFICATIONS · AI-ASSISTED',
    title: 'access-review',
    blurb: 'An access certification queue that puts the evidence next to every decision: last use, how access was granted, peer comparison, and a keep, revoke, or modify recommendation. Claude can investigate the flagged items with read-only tools. A person decides every item, and the export is the audit record.',
    stack: ['Python', 'JavaScript', 'Claude', 'Audit export'],
    links: [{ label: 'GitHub', href: `${GITHUB}/access-review` }],
    Visual: ReviewVisual,
  },
  {
    id: 'aquasite',
    flip: false,
    tag: 'PERSONAL PROJECT · FULL STACK',
    title: 'AquaSite',
    blurb: 'A siting tool for shellfish and seaweed farms. Click the water and it pulls satellite temperature and chlorophyll from ERDDAP, depth from Google, and tides and currents from the nearest NOAA stations, then scores the spot for the species you pick and shows which reading drove the score.',
    stack: ['Leaflet.js', 'Node.js', 'Express', 'PostgreSQL', 'NOAA CO-OPS', 'ERDDAP', 'Google Maps Platform'],
    links: [{ label: 'Live demo', href: './aquasite/' }],
    Visual: AquaSiteVisual,
  },
];

// IIQ experience mapped to its Identity Security Cloud counterpart.
const iscMap = [
  { iiq: 'Applications and connectors', isc: 'Sources', mine: '120+ applications through AD, JDBC, Oracle EBS, Salesforce, SCIM, and web services' },
  { iiq: 'Identity mappings and attribute rules', isc: 'Identity profiles and transforms', mine: 'Attribute logic rebuilt as tested ISC transforms in isc-transforms' },
  { iiq: 'BeanShell rules', isc: 'Cloud rules and connector rules', mine: 'Correlation, build map, and provisioning rules across federal and telecom deployments' },
  { iiq: 'Lifecycle events and workflows', isc: 'Lifecycle states and workflows', mine: 'Joiner, mover, and leaver flows, including access gated on completed training' },
  { iiq: 'Roles, certifications, policies', isc: 'Roles, access profiles, certification campaigns', mine: '200+ business and 300+ IT roles, with event-based reviews on transfer' },
  { iiq: 'Custom Java and REST integrations', isc: 'ISC REST APIs and SaaS connectors in TypeScript', mine: 'ISC Search API client in identity-mcp; React, TypeScript, and Node from startup work' },
];

const work = [
  {
    title: 'Federal ICAM consulting',
    detail: 'Senior SailPoint developer on a team of six for a federal agency. Built joiner, mover, and leaver workflows across AD, SCIM, REST, and flat-file connectors, gated access on completed training through an LMS integration, and containerized IdentityIQ on Azure.',
    outcome: 'Team of 6 · containerized IIQ on Azure',
    flow: 'EASY DYNAMICS · 2023–NOW',
  },
  {
    title: 'Governing GitHub service accounts and bots',
    detail: 'Brought bots and tokens in GitHub Enterprise Cloud under SailPoint governance through direct REST API calls, with human access provisioned through Entra ID and Microsoft Graph.',
    outcome: 'Owners and reviews for non-human identities',
    flow: 'GITHUB REST · MICROSOFT GRAPH',
  },
  {
    title: 'Role-based access from the ground up',
    detail: 'Designed the RBAC framework at an Alaska telecom and built the roles in IdentityIQ, with certification campaigns for roles, entitlements, and accounts, and event-based reviews when someone transfers or changes manager.',
    outcome: '200+ business roles · 300+ IT roles',
    flow: 'GCI · 2020–2023',
  },
  {
    title: 'Applications, upgrades, and ticketing',
    detail: 'Connected and maintained applications through AD, JDBC, Oracle EBS, Salesforce, SCIM, and web services, with custom correlation and provisioning rules. Integrated IdentityIQ with Cherwell to open provisioning and deprovisioning tickets, and led the 8.1 and 8.2 upgrades.',
    outcome: '120+ applications · 2 major upgrades',
    flow: 'GCI · 2020–2023',
  },
];

// Career path for the "How I got here" section.
const career = [
  {
    years: '2009–2018',
    title: 'Audit and controls',
    where: 'Quality engineering at Genentech, including a large biotech plant built in South Korea · BIOTRONIK · Berkeley Advanced Biomaterials',
    did: 'Nine years as a quality engineer and auditor in pharma, biotech, and medical devices: inspections, audits, SOPs, CAPA, and change control, and training teams to work within them.',
    gave: 'Access reviews and certifications are audits. I spent nine years on both sides of one.',
    certs: ['ASQ Certified Quality Engineer', 'ASQ Certified Quality Auditor', 'Six Sigma Green Belt'],
  },
  {
    years: '2018–2020',
    title: 'Startups: React, TypeScript, Node',
    where: 'Tech Academy bootcamp · Mission Ready Marketing · GreenStand · co-founder, FairTree',
    did: 'Built a lead-generation app for realtors in React, TypeScript, and Node, and data tools for a nonprofit tracking tree planting. Co-founded FairTree, an environmental consultancy, and stayed with it for five years.',
    gave: 'ISC custom connectors are TypeScript on Node, the stack I shipped startup apps in.',
    certs: [],
  },
  {
    years: '2020–now',
    title: 'SailPoint IIQ and ISC',
    where: 'GCI · Easy Dynamics, federal ICAM',
    did: 'Lead IdentityIQ engineer at an Alaska telecom, then senior SailPoint developer on federal programs, working in IdentityIQ and Identity Security Cloud.',
    gave: 'Where both meet: governance that holds up in an audit and works for the people using it.',
    certs: ['SailPoint IdentityIQ Engineer', 'SailPoint ISC Administrator'],
  },
];

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  };
  return (
    <button type="button" className="copy-email" onClick={copy} aria-live="polite">
      {copied ? 'Copied ✓' : 'Copy address'}
    </button>
  );
}

function App() {
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark">MP</span>Mark Petersen</a>
        <nav>
          <a href="#projects">Projects</a>
          <a href="#isc">IIQ → ISC</a>
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a className="nav-contact" href="#contact">Contact</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="mono accent">IAM ENGINEER · ANCHORAGE, AK · REMOTE</p>
          <h1>SailPoint engineer, <span className="hl">IIQ and Identity Security Cloud.</span></h1>
          <p className="hero-sub">Federal ICAM consulting at Easy Dynamics.</p>
          <p className="lede">Identity governance across Active Directory, Entra ID, and GitHub Enterprise, for people and non-human identities. Off the clock I build apps and LLM agents to explore how to govern them.</p>
          <ul className="cert-row" aria-label="Certifications">
            {certifications.map((c) => (
              <li key={c.name} className={c.status === 'earned' ? 'cert-earned' : 'cert-progress'}>
                <span aria-hidden="true">{c.status === 'earned' ? '✓' : '◷'}</span>
                <span className="cert-name">{c.name}{c.status !== 'earned' && <em> · {c.status}</em>}</span>
              </li>
            ))}
          </ul>
          <div className="hero-actions">
            <a className="button" href={`mailto:${EMAIL}`}>Email me</a>
            <a className="text-link" href="#projects">See the ISC projects →</a>
          </div>
        </div>
        <LifecycleRing />
      </section>

      <section className="projects" id="projects">
        <div className="section-head">
          <p className="mono accent">01 · THINGS I BUILD</p>
          <h2>Projects</h2>
        </div>
        <div className="project-grid">
          {projects.map(({ id, flip, tag, title, blurb, stack, links: plinks, Visual }) => (
            <article key={id} className={`project project-featured ${flip ? 'project-flip' : ''}`}>
              <div className="project-visual"><Visual /></div>
              <div className="project-body">
                <p className="mono accent">{tag}</p>
                <h3>{title}</h3>
                <p>{blurb}</p>
                <div className="chips">{stack.map((s) => <span key={s}>{s}</span>)}</div>
                {plinks.length > 0 && (
                  <div className="project-links">
                    {plinks.map((l) => <a key={l.label} href={l.href}>{l.label} ↗</a>)}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="isc" id="isc">
        <div className="section-head">
          <p className="mono accent">02 · IIQ TO ISC</p>
          <h2>The same identity problems, in Identity Security Cloud.</h2>
        </div>
        <div className="isc-table" role="table" aria-label="IdentityIQ experience mapped to Identity Security Cloud">
          <div className="isc-row isc-header" role="row">
            <span role="columnheader">IdentityIQ</span>
            <span role="columnheader">Identity Security Cloud</span>
            <span role="columnheader">My work</span>
          </div>
          {iscMap.map((r) => (
            <div className="isc-row" role="row" key={r.isc}>
              <span role="cell" className="isc-iiq">{r.iiq}</span>
              <span role="cell" className="isc-isc"><span className="isc-arrow" aria-hidden="true">→</span>{r.isc}</span>
              <span role="cell" className="isc-mine">{r.mine}</span>
            </div>
          ))}
        </div>
        <article className="migration">
          <p className="mono accent">SKILL · IIQ TO ISC MIGRATION</p>
          <h3>Assessment and planning for moving IIQ to ISC</h3>
          <p>Inventorying applications, rules, and workflows; deciding what moves as configuration, what becomes a transform or cloud rule, and what needs to be redesigned; and sequencing the move so certifications and lifecycle events keep running.</p>
        </article>
      </section>

      <section className="work" id="work">
        <div className="section-head">
          <p className="mono accent">03 · DAY JOB</p>
          <h2>Identity engineering</h2>
        </div>
        <div className="work-list">
          {work.map((w, i) => (
            <article className="work-row" key={w.title}>
              <span className="mono dim">0{i + 1}</span>
              <div>
                <h3>{w.title}</h3>
                <p>{w.detail}</p>
                <p className="outcome mono">{w.outcome}</p>
              </div>
              <span className="mono flow">{w.flow}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="career" id="about">
        <div className="section-head">
          <p className="mono accent">04 · HOW I GOT HERE</p>
          <h2>Quality taught me to audit. Code taught me to build. Identity is where I do both.</h2>
          <p className="career-origin mono">B.S. CHEMISTRY · UNIVERSITY OF OREGON</p>
        </div>
        <ol className="career-path">
          {career.map((c) => (
            <li className="career-step" key={c.title}>
              <span className="career-dot" aria-hidden="true" />
              <p className="mono accent">{c.years}</p>
              <h3>{c.title}</h3>
              <p className="career-where">{c.where}</p>
              <p className="career-did">{c.did}</p>
              <p className="career-gave">{c.gave}</p>
              {c.certs.length > 0 && (
                <div className="chips">{c.certs.map((cert) => <span key={cert}>{cert}</span>)}</div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <footer id="contact">
        <div>
          <p className="mono accent">05 · CONTACT</p>
          <h2>Hiring for SailPoint or ISC? Let’s talk.</h2>
          <p>Open to remote IAM engineering roles. Email me and I’ll send a résumé tailored to your role.</p>
        </div>
        <div className="contact-card">
          <p className="mono dim">EMAIL</p>
          <a className="contact-email" href={`mailto:${EMAIL}`}>{EMAIL}</a>
          <div className="contact-actions">
            <a className="button" href={`mailto:${EMAIL}?subject=SailPoint%20role`}>Write an email</a>
            <CopyEmail />
          </div>
          <p className="contact-more">
            <a href={GITHUB}>GitHub ↗</a>
            <span>Anchorage, Alaska · UTC−9 · remote</span>
          </p>
        </div>
        <p className="footer-note mono">© 2026 MARK PETERSEN · MADE IN ALASKA</p>
      </footer>
    </main>
  );
}

export default App;
