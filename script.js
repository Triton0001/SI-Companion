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

// Base vanilla refinery conversion rates, expressed as ingots per kilogram of ore.
// The refinery modifier is applied on top, so modded refinery values can be entered directly.
const oreDefs = {
  'Iron Ore': { ingot: 'Iron Ingot', baseYield: 0.7 },
  'Nickel Ore': { ingot: 'Nickel Ingot', baseYield: 0.4 },
  'Silicon Ore': { ingot: 'Silicon Wafer', baseYield: 0.7 },
  'Cobalt Ore': { ingot: 'Cobalt Ingot', baseYield: 0.3 },
  'Magnesium Ore': { ingot: 'Magnesium Powder', baseYield: 0.007 },
  'Silver Ore': { ingot: 'Silver Ingot', baseYield: 0.1 },
  'Gold Ore': { ingot: 'Gold Ingot', baseYield: 0.01 },
  'Platinum Ore': { ingot: 'Platinum Ingot', baseYield: 0.005 },
  'Uranium Ore': { ingot: 'Uranium Ingot', baseYield: 0.007 }
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

const oreSelect = document.getElementById('ore')
Object.keys(oreDefs).forEach(name => {
  const option = document.createElement('option')
  option.value = name
  option.textContent = name
  oreSelect.appendChild(option)
})

const baseRateInput = document.getElementById('base-rate')
const speedModifierInput = document.getElementById('speed-modifier')
const yieldModifierInput = document.getElementById('yield-modifier')

document.getElementById('ore-calc').addEventListener('click', () => {
  const oreName = oreSelect.value
  const ore = oreDefs[oreName]
  const amount = Math.max(0, Number(document.getElementById('ore-amount').value) || 0)
  const baseRate = Math.max(0, Number(baseRateInput.value) || 0)
  const speedModifier = Math.max(0, Number(speedModifierInput.value) || 0)
  const modifier = Math.max(0, Number(yieldModifierInput.value) || 0)
  const output = document.getElementById('ore-output')
  const ingots = amount * ore.baseYield * modifier
  const effectiveRate = baseRate * speedModifier
  const refiningSeconds = effectiveRate > 0 ? amount / effectiveRate : null

  output.innerHTML = ''
  const frag = document.createDocumentFragment()
  addSection(frag, 'Refining Calculation', [
    ['Ore input', `${formatNumber(amount)} kg of ${oreName}`],
    ['Base refining rate', `${formatNumber(baseRate)} kg ore/s`],
    ['Refining speed modifier', `${formatNumber(speedModifier * 100)}%`],
    ['Effective refining rate', `${formatNumber(effectiveRate)} kg ore/s`],
    ['Estimated refining time', refiningSeconds === null ? 'Enter a speed above 0' : formatDuration(refiningSeconds)],
    ['Base conversion', `${formatNumber(ore.baseYield)} kg ${ore.ingot} per kg ore`],
    ['Refinery yield modifier', `${formatNumber(modifier * 100)}%`],
    ['Estimated output', `${formatNumber(ingots)} kg ${ore.ingot}`]
  ])
  output.appendChild(frag)
})

document.querySelectorAll('[role="tab"]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[role="tab"]').forEach(button => {
      const active = button === tab
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-selected', active)
    })
    document.querySelectorAll('.tool-panel').forEach(panel => {
      panel.hidden = panel.id !== tab.dataset.tab
    })
  })
})

document.getElementById('ore-calc').click()

