const techDefs = {
  'Common Tech': {
    resources: { 'Iron Ingot': 90, 'Silicon Wafer': 80, 'Cobolt Ingot': 32, 'Silver Ingot': 24, 'Gold Ingot': 16 },
    components: {},
    craftSeconds: 6
  },
  'Rare Tech': {
    resources: { 'Uranium Ingot': 10 },
    components: { 'Common Tech': 5 },
    craftSeconds: 10
  },
  'Exotic Tech': {
    resources: { 'Platinum Ingot': 10 },
    components: { 'Rare Tech': 5 },
    craftSeconds: 20
  },
  'Prosonic Tech': {
    resources: { 'Platinum Ingot': 10, 'Iron Ingot': 200, 'Cobolt Ingot': 50, 'Silicon Wafer': 100, 'Magnesium Powder': 1, 'Uranium Ingot': 1 },
    components: { 'Exotic Tech': 250 },
    craftSeconds: 20
  },
  'Tellurium Tech': {
    resources: { 'Platinum Ingot': 1, 'Gold Ingot': 10, 'Iron Ingot': 250, 'Silver Ingot': 50, 'Uranium Ingot': 10 },
    components: { 'Prosonic Tech': 2 },
    craftSeconds: 20
  }
}

const assembler = {
  name: 'T3 assembler with 4 normal speed modules',
  powerMw: 22.4,
  uraniumGramsPerMwSecond: 3.59
}

function formatNumber(n){
  return n.toLocaleString(undefined, {maximumFractionDigits: 2})
}

function formatDuration(seconds) {
  if (seconds < 60) return `${formatNumber(seconds)} seconds`

  const minutes = seconds / 60
  if (minutes < 60) return `${formatNumber(minutes)} minutes`

  return `${formatNumber(minutes / 60)} hours`
}

function calc(techName, qty) {
  const resources = {}
  const craftCounts = {}
  const craftBreakdown = []

  function addResource(name, amount) {
    resources[name] = (resources[name] || 0) + amount
  }

  function addCraftCount(name, amount) {
    craftCounts[name] = (craftCounts[name] || 0) + amount
  }

  function expand(name, count) {
    const def = techDefs[name]
    if (!def) return

    addCraftCount(name, count)

    for (const [r, a] of Object.entries(def.resources || {})) {
      addResource(r, a * count)
    }

    for (const [comp, cqty] of Object.entries(def.components || {})) {
      const totalCompQty = cqty * count
      craftBreakdown.push({
        name: comp,
        count: totalCompQty,
        perParent: cqty,
        parent: name,
        parentCount: count
      })
      expand(comp, totalCompQty)
    }
  }

  craftBreakdown.push({
    name: techName,
    count: qty,
    requested: true
  })

  expand(techName, qty)

  const craftSeconds = Object.entries(craftCounts).reduce((total, [name, count]) => {
    return total + (techDefs[name].craftSeconds || 0) * count
  }, 0)
  const uraniumGrams = craftSeconds * assembler.powerMw * assembler.uraniumGramsPerMwSecond

  return { resources, craftCounts, craftBreakdown, craftSeconds, uraniumGrams }
}

function addSection(parent, title, rows) {
  const section = document.createElement('div')
  section.className = 'result-section'

  const heading = document.createElement('h3')
  heading.textContent = title
  section.appendChild(heading)

  if (rows.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'empty'
    empty.textContent = 'None'
    section.appendChild(empty)
  } else {
    rows.forEach(([label, value]) => {
      const row = document.createElement('div')
      row.className = 'res-row'
      const left = document.createElement('div')
      left.textContent = label
      const right = document.createElement('div')
      right.innerHTML = `<b>${value}</b>`
      row.appendChild(left)
      row.appendChild(right)
      section.appendChild(row)
    })
  }

  parent.appendChild(section)
}

document.getElementById('calc').addEventListener('click', () => {
  const tech = document.getElementById('tech').value
  const qty = Math.max(1, parseInt(document.getElementById('qty').value || '1', 10))
  const out = document.getElementById('output')
  out.innerHTML = ''
  const result = calc(tech, qty)
  if (Object.keys(result.resources).length === 0) {
    out.textContent = 'No resources required.'
    return
  }
  const frag = document.createDocumentFragment()

  addSection(frag, 'Craft-up Breakdown', result.craftBreakdown.map(item => {
    if (item.requested) return [`${item.name} requested`, `${formatNumber(item.count)} total`]

    return [
      `${item.name} (${formatNumber(item.perParent)} per ${item.parent})`,
      `${formatNumber(item.count)} total for ${formatNumber(item.parentCount)} ${item.parent}`
    ]
  }))

  addSection(frag, 'Raw Resources', Object.entries(result.resources)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, amount]) => [name, formatNumber(amount)]))

  addSection(frag, 'T3 Assembler Power', [
    ['Assembler setup', assembler.name],
    ['Total craft time', formatDuration(result.craftSeconds)],
    ['Power draw', `${formatNumber(assembler.powerMw)} MW`],
    ['Uranium for power', `${formatNumber(result.uraniumGrams / 1000)} kg`]
  ])

  out.appendChild(frag)
})

