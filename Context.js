
// Constants

const You = '\n> You '
const empty = '\u200B'

// Text and context parsing stuff

function extractSections(text, headings){
  let result = []
  let cursor = 0
  
  for(let i = 0; i < headings.length; i++){
    let start = text.indexOf(headings[i], cursor)
    if(start === -1){
      result.push('')
      continue
    }
    start += headings[i].length

    let end = -1
    for(let j = i + 1; j < headings.length && end === -1; j++){
      end = text.indexOf(headings[j], start)
    }

    if(end === -1){
      end = text.length
    }
    result.push(text.slice(start, end))
    cursor = end
  }

  return result
}

function censor(text, actionstr){
  for(let idx = text.indexOf(actionstr); -1 < idx; idx = text.indexOf(actionstr, idx)){
    let jdx = text.indexOf('\n>', idx + 1)
    let result = text.slice(0, idx)
    if(-1 < jdx){
      result += text.slice(jdx)
    }
    text = result
  }
  return text
}

const ctxHeadings = [
  '',
  'World Lore:\n',
  'Story Summary:\n',
  'Memories:\n',
  'Recent Story:\n',
  '[Author\'s note: ',
  ']\n'
]

function splatContext(text){
  let result = extractSections(text, ctxHeadings)

  return { /* If one of the sections is empty, it is set to '' instead. */
    PE: result[0], // Plot Essentials
    SC: result[1], // Story Cards
    SS: result[2], // Story Summary
    MM: result[3], // Memories
    RS: result[4], // Recent Story
    AN: result[5], // Author's Note
    LA: result[6], // Last Action
    length: text.length
  }
}

function unsplatContext(ctx){
  return  ctxHeadings[0] + ctx.PE +
          ctxHeadings[1] + ctx.SC +
          ctxHeadings[2] + ctx.SS +
          ctxHeadings[3] + ctx.MM +
          ctxHeadings[4] + ctx.RS +
          ctxHeadings[5] + ctx.AN +
          ctxHeadings[6] + ctx.LA
}

function inject(ctx, payload, action = (ctx, payload) => { ctx.LA += payload }){
  const prefix = '...' // AI doesn't seem to have much of an issue when this is put into the beginning of the recent story
  let additions = prefix.length + payload.length
  let overflow = (ctx.length + additions) - info.maxChars
  if(0 < overflow){
    ctx.RS = ctx.RS.slice(overflow)
    ctx.RS = ctx.RS.slice(ctx.RS.search(/[\s]/g))
    ctx.RS = prefix + ctx.RS
  }
  action(ctx, payload)
  ctx.length = Object.values(ctx).reduce(
    (accum, sum) => { return typeof sum !== 'string' ? accum : accum + sum.length }, 0
  )
  return ctx // For convenience
}

// Module Stuff

if(state.modules == undefined){
    state.modules = []
}

const modulesDo = (hooktype) => {
    let mods
    if(hooktype === 'Output'){
        mods = [...state.modules].reverse()
    }else{
        mods = state.modules
    }
    
    for(mod of mods){
        eval?.(mod.Library)
    }

    let stop = false
    for(mod of mods){
        let hook = mod[hooktype]
        if(hook){
            ;({ text, stop = stop } = eval?.(hook));
        }
    }

    return { text, stop }
}

// WEAPONS SYSTEM

// combat entities look like this:
/*
var entity = {
    health: 9001,
    weapons: {"fists": fists,
        "random weapon 1" with random ammo,
        "random weapon 2" with random ammo},
    armors: ["random armor 1", "random armor 2"]
}
*/

/*
function rand(a, b){
    if(b < a){
        [a, b] = [b, a]
    }
    return Math.random() * (a - b) + b
}

function irand(a, b){return Math.floor(rand(a, b))}

function Weapon(name, damageMin, damageMax, ammoMin, ammoMax){
    return [name, { damageMin, damageMax, ammoMin, ammoMax }]
}

function Armor(name, blockMin, blockMax){
    return { name, blockMin, blockMax }
}

var weaponPool = Object.fromEntries([
    Weapon("fists", 2, 4, -1, -1),
    Weapon("knife", 3, 8, -1, -1),
    Weapon("gun", 6, 7, 4, 12),
    Weapon("grenade", 10, 10, 1, 2)
])

var armorPool = [
    Armor("shirt", 0, 1),
    Armor("codpiece", 1, 5),
    Armor("cape", 0, 3)
]

function makeWeapon(weaponName = null){
    
    if(weaponName == null){
        // Need two lines here since dictionaries don't have the '.length' property
        var wp = Object.keys(weaponPool)
        weaponName = wp[Math.floor(Math.random() * (wp.length - 1)) + 1]
    }
    
    weapon = { ... weaponPool[weaponName] }
    weapon.ammo = Math.floor(rand(weapon.ammoMin, weapon.ammoMax + 1))
    delete weapon.ammoMin
    delete weapon.ammoMax
    
    return [weaponName, weapon]
}

function makeArmor(){
    return { ... armorPool[Math.floor(Math.random() * armorPool.length)] }
}

function makeEnemy(player){
    return {
        health: Math.floor(player.health * rand(0.85, 1.15)),
        weapons: Object.fromEntries([makeWeapon("fists"), makeWeapon()]),
        armors: [makeArmor()]
    }
}

function attack(attacker, weapon, defender){
    weapon = attacker.weapons[weapon]
     if(0 != weapon.ammo){ // Sentinel value of infinite ammo items is -1
         if(0 < weapon.ammo){
             weapon.ammo--
         }
         var damage = irand(weapon.damageMin, weapon.damageMax + 1)
         var block = defender.armors.map(
             (armor) => irand(armor.blockMin, armor.blockMax)
         ).reduce(
             (a, b) => a + b,
             0
         )
         damage = Math.max(0, damage - block)
         defender.health -= damage
         return true
     }
     return false
}

*/

// MISCELLANEOUS ROUTINES

function indexLast(str, substr){
    let i = str.indexOf(substr)
    if(i < 0){
        return -1
    }
    return i + substr.length
}

function once(key){
  key = key + '_ONCE'
  if(key in state){
    return false
  }else{
    state[key] = true
    return true
  }
}

function banner(){
    if(info.actionCount == 0){
        log("------------------------")
        log("------------------------")
        log("-----NEW ADVENTURE------")
        log("------------------------")
        log("------------------------")
    }
}

function arreq(a, b){
    if(a.length !== b.length){
        return false
    }
    for(let i = 0; i < a.length; i++){
        if(a[i] != b[i]){
            return false
        }
    }
    return true
}

// Inventory management

if(state.inventory === undefined){
  state.inventory = []
}

function cleaninventory(){
    //For when the player rewinds the history to a point before they acquired certain items.
    const si = state.inventory
    for(let i = 0; i < si.length; i++){
        if(history.length < si[i].birth){
            si.splice(i, 1)
            i--
            continue
        }
    }
}

cleaninventory()

// Mapping and Location

const map = {
    'Slums District': ['Center District', 'Ghost District', 'Hollow District'],
    'Eden District': ['Center District'],
    'Rustback District': ['Center District', 'Hollow District'],
    'Center District': ['Rustback District', 'Eden District', 'Hollow District', 'Slums District'],
    'Hollow District': ['Center District', 'Slums District', 'Rustback District'],
    'Ghost District': ['Slums District']
}

if(state.playerloc == undefined){
    state.playerloc = 'Center District'
}

// Player Health

if(state.HP == undefined){
    state.HP = 100
}

// Wallet  Code

if(state.wallet === undefined){
  state.wallet = 0
}

// Character creation

if(state.character === undefined){
  state.character = {
    Name:     null,
//    Weapon: null,
    Race:     null,
    Gender:   null,
    Class:    null,
    Implant:  null
  }
}

// Code execution & statefulness

if(state.boot === undefined){
    state.boot = []
}

function unset(n){
    state.boot.splice(n, 1)
}

function bootup(){
    for(s of state.boot){
        eval(s)
    }
}

bootup()
