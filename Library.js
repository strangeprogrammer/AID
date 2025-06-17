
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

function once(flag){
  flag = flag + "_ONCE"
  if(flag in Object.keys(state)){
    state[flag] != state[flag]
    return state[flag]
  }else{
    state[flag] = true
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

// Constants

const playerDo = "\n> You "
const empty = "\u200B"

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