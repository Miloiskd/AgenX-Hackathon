const SERVICE_NAMES = {
  payment: 'Payment Service',
  shipping: 'Shipping Service',
  bug: 'App Service',
  auth: 'Auth Service',
  notification: 'Notification Service',
  other: 'Backend Service',
};

// Infer which edge (0-4) fails based on the AI description
function inferFailEdge(description) {
  const d = (description || '').toLowerCase();
  if (d.includes('database') && (d.includes('fail') || d.includes('error'))) return 4;
  if (d.includes('external') || d.includes('third-party') || d.includes('gateway')) return 3;
  if ((d.includes('service') || d.includes('backend')) && (d.includes('fail') || d.includes('error'))) return 3;
  if (d.includes('api') && (d.includes('fail') || d.includes('error'))) return 2;
  return 3; // default: Service → External API
}

export function DiagramViewer({ category, diagramDescription }) {
  const serviceName = SERVICE_NAMES[category?.toLowerCase()] ?? SERVICE_NAMES.other;
  const nodes = ['User', 'Frontend', 'API Gateway', serviceName, 'External API', 'Database'];
  const failEdge = inferFailEdge(diagramDescription);

  const W = 900;
  const H = 180;
  const cy = 90;
  const nW = 120;
  const nH = 48;
  const centersX = [75, 225, 375, 525, 675, 825];

  const NORMAL_COLOR = '#aa3bff';
  const NORMAL_BG = 'rgba(170,59,255,0.06)';
  const NORMAL_TEXT = '#08060d';
  const FAIL_COLOR = '#dc2626';
  const FAIL_BG = 'rgba(220,38,38,0.08)';
  const FAIL_TEXT = '#dc2626';
  const ARROW_NORMAL = '#9ca3af';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{
        width: '100%',
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e4e7',
        display: 'block',
      }}
      aria-label="System architecture diagram"
    >
      <defs>
        {centersX.slice(0, -1).map((_, i) => {
          const isFail = i === failEdge;
          const color = isFail ? FAIL_COLOR : ARROW_NORMAL;
          return (
            <marker
              key={i}
              id={`arrowhead-${i}`}
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill={color} />
            </marker>
          );
        })}
      </defs>

      {/* Arrows */}
      {centersX.slice(0, -1).map((cx, i) => {
        const x1 = cx + nW / 2;
        const x2 = centersX[i + 1] - nW / 2 - 1;
        const midX = (x1 + x2) / 2;
        const isFail = i === failEdge;
        const strokeColor = isFail ? FAIL_COLOR : ARROW_NORMAL;

        return (
          <g key={i}>
            <line
              x1={x1}
              y1={cy}
              x2={x2}
              y2={cy}
              stroke={strokeColor}
              strokeWidth={isFail ? 2.5 : 1.5}
              strokeDasharray={isFail ? '5,3' : undefined}
              markerEnd={`url(#arrowhead-${i})`}
            />
            {isFail && (
              <>
                <rect
                  x={midX - 18}
                  y={cy - 28}
                  width={36}
                  height={18}
                  rx="4"
                  fill={FAIL_COLOR}
                />
                <text
                  x={midX}
                  y={cy - 16}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="system-ui, 'Segoe UI', Roboto, sans-serif"
                >
                  FAIL
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {centersX.map((cx, i) => {
        const x = cx - nW / 2;
        const y = cy - nH / 2;
        const isFailing = i === failEdge || i === failEdge + 1;
        const borderColor = isFailing ? FAIL_COLOR : NORMAL_COLOR;
        const bgColor = isFailing ? FAIL_BG : NORMAL_BG;
        const textColor = isFailing ? FAIL_TEXT : NORMAL_TEXT;
        const strokeWidth = isFailing ? 2 : 1.5;

        // Wrap long labels (e.g. "Payment Service") into two lines
        const words = nodes[i].split(' ');
        const line1 = words.length > 2 ? words.slice(0, Math.ceil(words.length / 2)).join(' ') : nodes[i];
        const line2 = words.length > 2 ? words.slice(Math.ceil(words.length / 2)).join(' ') : null;

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={nW}
              height={nH}
              rx="6"
              fill={bgColor}
              stroke={borderColor}
              strokeWidth={strokeWidth}
            />
            {line2 ? (
              <>
                <text
                  x={cx}
                  y={cy - 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={textColor}
                  fontSize="11"
                  fontWeight={isFailing ? '700' : '500'}
                  fontFamily="system-ui, 'Segoe UI', Roboto, sans-serif"
                >
                  {line1}
                </text>
                <text
                  x={cx}
                  y={cy + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={textColor}
                  fontSize="11"
                  fontWeight={isFailing ? '700' : '500'}
                  fontFamily="system-ui, 'Segoe UI', Roboto, sans-serif"
                >
                  {line2}
                </text>
              </>
            ) : (
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={textColor}
                fontSize="11"
                fontWeight={isFailing ? '700' : '500'}
                fontFamily="system-ui, 'Segoe UI', Roboto, sans-serif"
              >
                {nodes[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
