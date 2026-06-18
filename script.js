const techDefs = {
  'Common Tech': {
    resources: { 'Iron Ingot': 90, 'Silicon Wafer': 80, 'Cobolt Ingot': 32, 'Silver Ingot': 24, 'Gold Ingot': 16 },
    components: {}
  },
  'Rare Tech': {
    resources: { 'Uranium Ingot': 10 },
    components: { 'Common Tech': 5 }
  },
  'Exotic Tech': {
    resources: { 'Platinum Ingot': 10 },
    components: { 'Rare Tech': 5 }
  },
  'Prosonic Tech': {
    resources: { 'Platinum Ingot': 10, 'Iron Ingot': 200, 'Cobolt Ingot': 50, 'Silicon Wafer': 100, 'Magnesium Powder': 1, 'Uranium Ingot': 1 },
    components: { 'Exotic Tech': 250 }
  },
  'Tellurium Tech': {
    resources: { 'Platinum Ingot': 1, 'Gold Ingot': 10, 'Iron Ingot': 250, 'Silver Ingot': 50, 'Uranium Ingot': 10 },
    components: { 'Prosonic Tech': 2 }
  }
}

function formatNumber(n){
  return n.toLocaleString(undefined, {maximumFractionDigits: 2})
}

function calc(techName, qty) {
  const totals = {}

  function addResource(name, amount) {
    totals[name] = (totals[name] || 0) + amount
  }

  function expand(name, count) {
    const def = techDefs[name]
    if (!def) return
    // add direct resources
    for (const [r, a] of Object.entries(def.resources || {})) {
      addResource(r, a * count)
    }
    // expand components recursively
    for (const [comp, cqty] of Object.entries(def.components || {})) {
      expand(comp, cqty * count)
    }
  }

  expand(techName, qty)
  // return raw totals
  return totals
}

document.getElementById('calc').addEventListener('click', () => {
  const tech = document.getElementById('tech').value
  const qty = Math.max(1, parseInt(document.getElementById('qty').value || '1', 10))
  const out = document.getElementById('output')
  out.innerHTML = ''
  const totals = calc(tech, qty)
  if (Object.keys(totals).length === 0) {
    out.textContent = 'No resources required.'
    return
  }
  const frag = document.createDocumentFragment()
  Object.entries(totals).sort().forEach(([k,v]) => {
    const row = document.createElement('div')
    row.className = 'res-row'
    const left = document.createElement('div')
    left.textContent = k
    const right = document.createElement('div')
    right.innerHTML = `<b>${formatNumber(v)}</b>`
    row.appendChild(left)
    row.appendChild(right)
    frag.appendChild(row)
  })


  out.appendChild(frag)
})

