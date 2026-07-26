import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'

const NODE_R = 36
const H_GAP = 120
const V_GAP = 108

const BRANCH_COLORS = [
  '#4A90E2', '#E67E22', '#2ECC71', '#9B59B6',
  '#E74C3C', '#1ABC9C', '#F39C12', '#e84393',
]

function buildHierarchy(people, rootId) {
  function build(id) {
    const p = people[id]
    if (!p) return null
    return {
      ...p,
      children: (p.children || []).map(build).filter(Boolean),
    }
  }
  return build(rootId)
}

function getBranchColor(node) {
  if (node.depth === 0) return '#4A90E2'
  let cur = node
  while (cur.parent && cur.parent.depth > 0) cur = cur.parent
  const idx = cur.parent?.children?.findIndex((c) => c === cur) ?? 0
  return BRANCH_COLORS[idx % BRANCH_COLORS.length]
}

export default function TreeView({ data, photos, onSelect, onAddChild }) {
  const svgRef = useRef(null)
  const gRef = useRef(null)
  const zoomRef = useRef(null)

  const { nodes, links } = useMemo(() => {
    const hier = buildHierarchy(data.people, data.rootId)
    if (!hier) return { nodes: [], links: [] }
    const root = d3.hierarchy(hier)
    d3.tree().nodeSize([H_GAP, V_GAP])(root)
    return { nodes: root.descendants(), links: root.links() }
  }, [data])

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return
    const svg = d3.select(svgRef.current)
    const g = d3.select(gRef.current)

    const zoom = d3.zoom()
      .scaleExtent([0.12, 4])
      .on('zoom', ({ transform }) => g.attr('transform', transform))

    zoomRef.current = zoom
    svg.call(zoom)

    const { clientWidth: w, clientHeight: h } = svgRef.current
    svg.call(zoom.transform, d3.zoomIdentity.translate(w / 2, 90).scale(1))

    return () => svg.on('.zoom', null)
  }, [])

  const diagonal = useMemo(() => d3.linkVertical().x((d) => d.x).y((d) => d.y), [])

  return (
    <svg ref={svgRef} className="tree-svg">
      <defs>
        {nodes.map((n) => {
          const photo = n.data.photoId ? photos[n.data.photoId] : null
          if (!photo) return null
          return (
            <clipPath key={`clip-${n.data.id}`} id={`clip-${n.data.id}`}>
              <circle cx="0" cy="0" r={NODE_R} />
            </clipPath>
          )
        })}
      </defs>

      <g ref={gRef}>
        {links.map((link, i) => (
          <path
            key={i}
            d={diagonal(link)}
            fill="none"
            stroke={getBranchColor(link.target)}
            strokeWidth={2.5}
            strokeOpacity={0.55}
          />
        ))}

        {nodes.map((node) => {
          const color = getBranchColor(node)
          const photo = node.data.photoId ? photos[node.data.photoId] : null
          const initials =
            `${node.data.firstName?.[0] || ''}${node.data.lastName?.[0] || ''}`.toUpperCase() || '?'

          return (
            <g
              key={node.data.id}
              transform={`translate(${node.x},${node.y})`}
            >
              <circle
                r={NODE_R + 4}
                fill="transparent"
                onClick={() => onSelect(node.data.id)}
                style={{ cursor: 'pointer' }}
              />

              <circle
                r={NODE_R}
                fill={photo ? '#1e2130' : color}
                stroke={color}
                strokeWidth={3}
                onClick={() => onSelect(node.data.id)}
                style={{ cursor: 'pointer' }}
              />

              {photo ? (
                <image
                  href={photo}
                  x={-NODE_R}
                  y={-NODE_R}
                  width={NODE_R * 2}
                  height={NODE_R * 2}
                  clipPath={`url(#clip-${node.data.id})`}
                  preserveAspectRatio="xMidYMid slice"
                  onClick={() => onSelect(node.data.id)}
                  style={{ cursor: 'pointer' }}
                />
              ) : (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={NODE_R * 0.52}
                  fontWeight="700"
                  fontFamily="system-ui, sans-serif"
                  pointerEvents="none"
                >
                  {initials}
                </text>
              )}

              <text
                y={NODE_R + 17}
                textAnchor="middle"
                fill="#c9d1e0"
                fontSize={12}
                fontWeight="500"
                fontFamily="system-ui, sans-serif"
                pointerEvents="none"
              >
                {node.data.firstName}
                {node.data.lastName ? ` ${node.data.lastName}` : ''}
              </text>

              {node.data.location ? (
                <text
                  y={NODE_R + 31}
                  textAnchor="middle"
                  fill="#6b7a99"
                  fontSize={10}
                  fontFamily="system-ui, sans-serif"
                  pointerEvents="none"
                >
                  {node.data.location.split(',')[0]}
                </text>
              ) : null}

              <g
                transform={`translate(${NODE_R - 6}, ${-NODE_R + 6})`}
                onClick={(e) => {
                  e.stopPropagation()
                  onAddChild(node.data.id)
                }}
                style={{ cursor: 'pointer' }}
              >
                <circle r={14} fill="#10b981" stroke="#0f1117" strokeWidth={2} />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={20}
                  fontWeight="700"
                  fontFamily="system-ui, sans-serif"
                  pointerEvents="none"
                  dy="1"
                >
                  +
                </text>
              </g>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
