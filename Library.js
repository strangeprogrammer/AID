// Configuration Options

if(state.useMods == undefined){
    state.useMods = true // Set to true or false depending upon your desired startup behavior
}

// Constants

const Do = '\n> You '
const Say = '\n> You say "'
const Response = '\n> /'
let You = Do
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

/*
const correctedEval = (code, additional = '') => {
  delete _ERROR_ESCAPE
  let retval = eval?.(`var _ERROR_ESCAPE = undefined;try{${code}}catch(e){_ERROR_ESCAPE = e}`)
  if(_ERROR_ESCAPE != undefined){
    throw _ERROR_ESCAPE
    let err = new Error(additional, { cause: _ERROR_ESCAPE })
    console.log(err)
    console.log(Object.keys(err))
    //throw err
  }
  return retval
}
*/

const modulesDo = (hooktype) => {
  let stop = false
  
  if(state.useMods){
    let mods
    if(hooktype === 'Output'){
      mods = [...state.modules].reverse()
    }else{
      mods = state.modules
    }
    
    let stop = false
    for(mod of mods){
      if(mod.Enabled){
        let hook = mod[hooktype]
        if(hook){
//          ;({ text, stop = stop } = correctedEval(mod.Library + ';' + hook, `In module ${mod.Module}'s ${hooktype} hook`));
          ;({ text, stop = stop } = eval?.(mod.Library + ';' + hook, `In module ${mod.Module}'s ${hooktype} hook`));
        }
      }
    }
  }

  return { text, stop }
}

const modTokenSaver = (s) => {
    state.overwrite = true
    state.output = empty
    return { text: s }
}

const uponMod = (name, cmd, action) => {
  name = name.trim()
  let sought = state.modules.findIndex((mod) => mod.Module === name)
  if(-1 < sought){
    return modTokenSaver(action(sought) || Response + cmd + ' \'' + name + '\' successful.\n')
  }else{
    return modTokenSaver(Response + 'module ' + name + ' not found.\n')
  }
}

const makeMod = (s) => {
  let [
    Module,
    Enabled,
    Library,
    Input,
    Context,
    Output,
    garbage
  ] = extractSections(s, [
    '// Module: ',
    '// Initially: ',
    '// Library',
    '// Input',
    '// Context',
    '// Output',
    '// End'
  ]);
  Module = Module.trim()
  let newMod = { Module, Enabled: Enabled.trim() === 'true', Library, Input, Context, Output }
  state.modules.push(newMod)
  return newMod
}

// Chat Commands

let commands = {
  'help': {
    desc: 'Display (basic) descriptions of all chat commands.',
    fn: (garbage) => {
    state.overwrite = true
    state.output =  Object.entries(commands).map(([name, cmd]) =>
      '/' + name + ' : ' + cmd.desc
    ).join('\n') + '\n'
  }},
  'js ': {
    desc: 'Evaluate a JavaScript expression and return the result.',
    fn: (args) => {
    state.overwrite = true
    state.output = eval?.(args)
  }}, 'set ': {
    desc: 'Set a variable (currently, only constants are supported) to be set before any other code runs.',
    fn:(args) => {
    state.overwrite = true
    state.output = empty
    let space = args.indexOf(' ')
    let k = args.slice(0, space)
    let v = args.slice(space + 1)
    state.boot.push('globalThis.' + k + ' = ' + v)
  }}, 'lsmods': {
    desc: 'List all modules in execution order and all enabled/disabled states.',
    fn: (garbage) => {
    let result = 'Mods: ' + (state.useMods ? 'Enabled' : 'Disabled') + '\n'
    let mods = state.modules
    for(let i = 0; i < mods.length; i++){
      result += String(i) + ': ' + mods[i].Module + ': ' + (mods[i].Enabled ? 'Enabled' : 'Disabled') + '\n'
    }
    // result = result.trimEnd()
    state.overwrite = true
    state.output = result
  }}, 'lsmod ': {
    desc: 'Show the enable/disable state of a specific module.',
    fn: (name) => {
    return uponMod(name, 'lsmod', (sought) => {
      return Response + name + ': ' + (state.modules[sought].enabled ? 'Enabled' : 'Disabled') + '\n'
    })
  }}, 'modson': {
    desc: 'Enable mods globally.',
    fn: (args) => {
    state.overwrite = true
    state.output = empty
    state.useMods = true
    return { text: You + '/modson successfully.\n' }
  }}, 'modsoff': {
    desc: 'Disable mods globally.',
    fn: (args) => {
    state.overwrite = true
    state.output = empty
    state.useMods = false
    return { text: You + '/modsoff successfully.\n' }
  }}, 'addmod ': {
    desc: 'Add a new module to the end of the modules list via a \'do\' action.',
    fn: (args) => {
    return modTokenSaver(Response + 'mkmod \'' + makeMod(args).Module + '\' successful.')
  }}, 'modon ': {
    desc: 'Enable specific mods.',
    fn: (names) => {
    names = names.split(' ')
    let missing
    if(missing = names.find(
      (name) => !state.modules.map((mod) => mod.Module).includes(name)
    )){
      return { text: Response + 'module ' + name + ' not found.\n' }
    }else{
      for(name of names){
        state.modules.find((mod) => mod.Module === name).Enabled = true
      }

      return modTokenSaver(Response + 'modon [' + names.join(', ') + '] successful.\n')
    }
  }}, 'modoff ': {
    desc: 'Disable specific mods.',
    fn: (names) => {
    names = names.split(' ')
    let missing
    if(missing = names.find(
      (name) => !state.modules.map((mod) => mod.Module).includes(name)
    )){
      return { text: Response + 'module ' + name + ' not found.\n' }
    }else{
      for(name of names){
        state.modules.find((mod) => mod.Module === name).Enabled = false
      }

      return modTokenSaver(Response + 'modoff ' + names.join(' ') + ' successful.\n')
    }
  }}, 'rmmod ': {
    desc: 'Remove a module from the modules list.',
    fn: (name) => {
    return uponMod(name, 'rmmod', (sought) => {
        state.modules.splice(sought, 1)
    })
  }}
}

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

// Code execution & statefulness

if(state.boot === undefined){
    state.boot = []
}

function unset(n){
    state.boot.splice(n, 1)
}

function bootup(){
  for(s of state.boot){
      eval?.(s)
  }
}

bootup()

if(once('InlineModules')){
  makeMod((() => {
    // Module: Dog_Example
    // Initially: false

    // Input

    const modifier = (text) => {
      return { text: text.replace('You', 'You and your dog') }
    }

    // End
  }).toString())

  makeMod((() => {
    // Module: Ferret_Example
    // Initially: false

    // Input

    const modifier = (text) => {
      return { text: text.replace('You', 'You and your ferret') }
    }

    // End
  }).toString())

  makeMod((() => {
    // Module: NC
    // Initially: true
    // Library
    //DO NOT CHANGE ANYTHING HERE (Exept the conflict & calming word strings if you want to make them better)
    const conflictWords = ["attack", "stab", "destroy", "break", "steal", "ruin", "burn", "smash", "sabotage", "disrupt", "vandalize", "overthrow", "assassinate", "plunder", "rob", "ransack", "raid", "hijack", "detonate", "explode", "ignite", "collapse", "demolish", "shatter", "strike", "slap", "obliterate", "annihilate", "corrupt", "infect", "poison", "curse", "hex", "summon", "conjure", "mutate", "provoke", "riot", "revolt", "mutiny", "rebel", "resist", "intimidate", "blackmail", "manipulate", "brainwash", "lie", "cheat", "swindle", "disarm", "fire", "hack", "overload", "flood", "drown", "rot", "dissolve", "slaughter", "terminate", "execute", "drama", "conflict", "evil", "kill", "slay", "defeat", "fight", "doom", "slice", "pain", "dying", "die", "perish", "blood"]

    const calmingWords = ["calm", "rest", "relax", "meditate", "sleep", "comfort", "hug", "smile", "forgive", "mend", "repair", "plant", "sing", "dance", "celebrate", "collaborate", "share", "give", "donate", "protect", "shelter", "trust", "hope", "dream", "revive", "eat", "drink", "balance", "cheer", "laugh", "play", "build", "bake", "craft", "cook", "empathize", "apologize", "befriend", "admire", "sympathize", "thank", "appreciate", "cherish", "love", "pet", "respect", "restore", "guide", "teach", "learn", "daydream", "wander", "explore", "discover", "reflect", "happy", "joy", "kind", "heal", "help", "assist"]

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

    const world = {
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
        //Weapon: null,
        Race:     null,
        Gender:   null,
        Class:    null,
        Implant:  null
      }
    }

    if(state.cooldown === undefined){
      state.cooldown = -1
    }

    Object.assign(commands, {
      /*'buy ': (item) => {
        state.inventory.push({
          item,
          birth: history.length
        })
      }, 'sell ': (args) => {
        console.log(args)
      }, 'shop ': (args) => {
        state.overwrite = true
        state.output = args
        console.log(state.output)
      }, 'credits': (args) => {
        state.overwrite = true
        state.output = state.wallet.toString()
        console.log(state.otuput)
      },*/ 'loc ': (destination) => {
        //Set the player's location
        if(cooldown < info.actionCount){
          let cooldown = info.actionCount + 5

          let source = world[state.playerloc]
          if(source.includes(destination)){// If can be reached by the player
            state.playerloc = destination
          }else{
            state.message = 'Error: ' + destination + ' can\'t be reached from ' + state.playerloc
            state.overwrite = true
            state.output = empty
            return { text: empty }
          }
        }else{
          state.message = 'Error: You must wait ' + (cooldown - info.actionCount) + 'more turns before changing location.'
          state.overwrite = true
          state.output = empty
          return { text: empty }
        }
      }, 'locs': (garbage) => {
        state.overwrite = true
        state.output = Object.keys(world).join('\n')
      }, 'loc?': (garbage) => {
        state.overwrite = true
        state.output = state.playerloc
      }
    })

    // Input
    if(state.character.Name === null){
      //Get the character name from plot essentials after the system prompts the player for it
      const PEM = state.memory.context // PEM = Plot Essentials and Memory
      const field = 'Name: '
      const start = PEM.indexOf(field) + field.length
      const terminator = '\n'
      const end = PEM.indexOf(terminator, start)
      state.character.Name = PEM.slice(start, end)
    }

    /* === STORY ARC CONFIGURATION === */
    state.originalAuthorsNote = `Writing style: dark, gritty, inventive, realistic, dark humor, emotional
    Theme: cyberpunk, dystopia, advanced technology, action, adventure, distant future, sci-fi, futuristic, Futurism, Odyssey
    - Keep scenes moving
    - assume strangers and ignorance
    - Focus on everyone in the scenes
    - Everyone needs a reason to occur
    - Write ensuring ${state.character.Name} can write own dialogue and make own decisions
    - Keep writing PG-13` //Add your story's authors note here. This will allow the system to modify the authors note whiile preserving your current one. If you have a dynamically changing authors note, you can instead put a "state.variableName" here.

    state.initialHeatValue = 0 //Increasing this will increase the chance of the temperature increasing in the first few moments of the story.
    state.initialTemperatureValue = 1 //Increasing this will increase the amount of conflict and tension in the initial sections of the story.
    state.temperatureIncreaseChance = 15 //Increasing this value makes the conflict and tension in the story advance quicker.

    state.heatIncreaseValue = 1 //Increasing this value makes the temperature increase more often, creating a faster paced story.
    state.temperatureIncreaseValue = 1 //Increasing this value makes the conflit and tension in the story advance by larger segments, so the story will feel less like a gradual slope of tension and more like big steps.

    state.playerIncreaseHeatImpact = 2 //The impact that the player has on increasing the conflict, so if the player attacks an NPC or does something drama inducing, the conflict and tension will increase by this amount.
    state.playerDecreaseHeatImpact = 2 //The impact that the player has on decreasing the conflict, so if the player helps others or is doing something relaxing, the conflict and tension will decrease by this amount.
    state.playerIncreaseTemperatureImpact = 1 //The impact that the player has on increasing the conflict, so if the player attacks an NPC or does something drama inducing, the conflict and tension will increase by this amount.
    state.playerDecreaseTemperatureImpact = 1 //The impact that the player has on decreasing the conflict, so if the player helps others or is doing something relaxing, the conflict and tension will decrease by this amount.
    state.threshholdPlayerIncreaseTemperature = 2 //This is the number of conflict words that have to be said by the player in their input in order to increase the temperature.
    state.threshholdPlayerDecreaseTemperature = 2 //This is the number of calming words that have to be said by the player in their input in order to decrease the temperature.

    state.modelIncreaseHeatImpact = 1 //The impact that the AI model has on increasing the conflict.
    state.modelDecreaseHeatImpact = 2 //The impact that the AI model has on decreasing the conflict.
    state.modelIncreaseTemperatureImpact = 1 //The impact that the AI model has on increasing the conflict.
    state.modelDecreaseTemperatureImpact = 1 //The impact that the AI model has on decreasing the conflict.
    state.threshholdModelIncreaseTemperature = 3 //This is the number of conflict words that have to be said by the AI Model in in order to increase the temperature.
    state.threshholdModelDecreaseTemperature = 3 //This is the number of conflict words that have to be said by the AI Model in in order to decrease the temperature.

    state.maximumTemperature = 12 //This is the maximum level of conflict the story can get to. Lower values make for a more calm experience, while higher values can make the story go overboard with the AI trying to kill you at every step. Be careful with this value, as it can get out of hand quite quickly.
    state.trueMaximumTemperature = 15 //This determines the actual maximum temperature, as random explosions can cause the normal maxmium temperature to increase beyond its normal state. Players cannot cause the temperature to increase beyond the normal maximum. !WARNING! TRUE MAXIMUM TEMPERATURE VALUES ABOVE 15 CAN CAUSE CHAOTIC AND HIGHLY DESTRUCTIVE EVENTS TO RUIN YOUR STORY. ONLY ENABLE VALUES ABOVE 15 IF YOU WANT A REALLY PUNISHING EXPERIENCE.

    state.minimumTemperature = 1 //This determines the lowest value that the player can get the temperature to. Systems like AI influence can reduce it to whatever the true minimum temperature value is.
    state.trueMinimumTemperature = 1 //This determines the true lowest value that the temperature can get to. No system can set the value of the temperature to anything lower.

    state.smartOverheatTimer = "This feature is currently being worked on, do not set it to true." //If you set this setting to true, it will make the overheat timer entirely dependent on what is being said and done in the story. For instance if people are in combat and fighting, or a heavily dramatic climax is going on, the smart timer will detect this and keep the action going for until the action is resolved. !WARNING! THIS FEATURE CAN BE INCREADIBLY BUGGY AND CAUSE CONFLICTS TO GO ON FOREVER DEPENDING ON YOUR MODEL AND SETTINGS. BE CAREFUL WHEN USING THIS.
    state.overheatTimer = 4 //After the maximum temperature is reached, the script will go into overheat mode, meaning that after this many actions, the temperature will start to decrease. This is good if you want your maximum tension point to last multiple actions before calming down.
    state.overheatReductionForHeat = 5 //After the overheat timer is over, the temperature will decrease by this amount. A higher number will make the story much calmer after the maxmium temperature point, a lower number will make the action decrease more gradually.
    state.overheatReductionForTemperature = 1 //After the overheat timer is over, the temperature will decrease by this amount. A higher number will make the story much calmer after the maxmium temperature point, a lower number will make the action decrease more gradually.

    state.cooldownTimer = 5 //After the overheat timer is over, this cooldown timer determines the number of actions the story will take before being able to increase the temperature and conflict again. A higher value will allow the player to have more downtime, a lower value will push the player to jump into the next conflict faster.
    state.cooldownRate = 2 //For each action that the cooldown phase goes for, the temperature will reduce by this amount. A higher value will make the temperature decrease more rapidly, a lower value will make the cooldown more of a gradual slope.

    state.randomExplosionChance = 3 //This determines the percent chance that the story will suddenly have the temperature increased by a large value.
    state.randomExplosionHeatIncreaseValue = 5 //This determines the impact of the random temperature increase. A higher value will make the story suddenly have something crazy happen, a lower value will make more of a mild surprise.
    state.randomExplosionTemperatureIncreaseValue = 2 //This determines the impact of the random temperature increase. A higher value will make the story suddenly have something crazy happen, a lower value will make more of a mild surprise.


    ///* DONT MODIFY ANYTHING BEYOND THIS POINT 
    function randomint(min, max) {
      min = Math.ceil(min)
      max = Math.floor(max)
      return Math.floor(Math.random() * (max - min + 1)) + min
    }

    const imodifier1 = (text) => {
      if (state.heat == undefined){
        state.heat = state.initialHeatValue
        state.cooldownMode = false
        state.overheatMode = false
      }
      if (state.storyTemperature == undefined){
        state.storyTemperature = state.initialTemperatureValue
      }
      const lowerText = text.toLowerCase()
      const words = lowerText.split(/\s+/)
      let conflictCount = 0
      let calmingCount = 0

      words.forEach(word => {
        const fixedWord = word.replace(/^[^\w]+|[^\w]+$/g, '')
        if (conflictWords.includes(fixedWord)) {
          conflictCount++
        }
        if (calmingWords.includes(fixedWord)) {
          calmingCount++
        }
      })

      if (state.cooldownMode == false){
        if (conflictCount > 0) {
          state.heat += conflictCount * state.playerIncreaseHeatImpact
          if (conflictCount >= state.threshholdPlayerIncreaseTemperature){
            state.storyTemperature += conflictCount * state.playerIncreaseTemperatureImpact
            log(`Detected ${conflictCount} conflict words (Player). Increasing heat & temperature.`)
          }
          else{
            log(`Detected ${conflictCount} conflict words (Player). Increasing heat.`)
          }
        }
        
        if (calmingCount > 0) {
          state.heat -= conflictCount * state.playerDecreaseHeatImpact
          if (calmingCount >= state.threshholdPlayerDecreaseTemperature){
            state.storyTemperature -= calmingCount * state.playerDecreaseTemperatureImpact
            log(`Detected ${calmingCount} calming words (Player). Decreasing heat & temperature.`)
          }
          else{
            log(`Detected ${calmingCount} calming words (Player). Decreasing heat.`)
          }
        }
      }

      state.chance = randomint(1, 100)
      if (state.chance <= state.randomExplosionChance){
        state.heat = state.heat + state.randomExplosionHeatIncreaseValue
        state.storyTemperature = state.storyTemperature + state.randomExplosionTemperatureIncreaseValue
        log("!WARNING! Explosion Occured! (+" + state.randomExplosionHeatIncreaseValue + " heat) (+" + state.randomExplosionTemperatureIncreaseValue + " temperature)")
      }
      if(state.cooldownMode == false && state.overheatMode == false){
        state.heat = state.heat + state.heatIncreaseValue
        log("Heat: " + state.heat)
      }
      state.chance = randomint(1, state.temperatureIncreaseChance)
      if (state.chance <= state.heat){
        state.heat = 0
        state.storyTemperature = state.storyTemperature + state.temperatureIncreaseValue
        log("Temperature Increased. Temperature is now " + state.storyTemperature)
      }
      if (state.storyTemperature >= state.maximumTemperature){
        if (state.cooldownMode == false && state.overheatMode == false){
          state.overheatMode = true
          state.overheatTurnsLeft = state.overheatTimer
          log("Overheat Mode Activated")
        }
      }
      if (state.cooldownMode == true){
        state.cooldownTurnsLeft --
        log("Cooldown Timer: " + state.cooldownTurnsLeft)
        state.storyTemperature = state.storyTemperature - state.cooldownRate
        if(state.cooldownTurnsLeft <= 0){
          state.cooldownMode = false
          log("Cooldown Mode Disabled")
        }
      }
      else{
        if(state.overheatMode == true){
          state.overheatTurnsLeft --
          log("Overheat Timer: " + state.overheatTurnsLeft)
          if (state.overheatTurnsLeft <= 0){
            state.storyTemperature = state.storyTemperature - state.overheatReductionForTemperature
            state.heat = state.heat - state.overheatReductionForHeat
            state.overheatMode = false
            state.cooldownMode = true
            state.cooldownTurnsLeft = state.cooldownTimer
            log("Cooldown Mode Activated")
          }
        }
      }

      if (state.storyTemperature > state.trueMaximumTemperature){
        state.storyTemperature = state.trueMaximumTemperature
        log("Temperature over maximum, recalibrating...")
      }
      if (state.storyTemperature <= 0){
        state.storyTemperature = 1
        log("Temperature under minimum, recalibrating...")
      }

      if (state.cooldownMode == false){
        log("cooldownMode false, deploying prompt")
      //Non-Optimized Story Prompts
        if (state.storyTemperature == 1) {
          state.memory.authorsNote = "Story Phase: Introduction. Introduce characters and locations. There should be no conflict or tension in the story. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 2) {
          state.memory.authorsNote = "Story Phase: Introduction. Introduce characters, locations, and plot hooks. There should be only a little conflict and tension in the story unless the player is seeking it out. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 3) {
          state.memory.authorsNote = "Story Phase: Introduction. Introduce characters, locations, and plot hooks. There should be only minor conflicts. Introduce the possibility of a moderate conflict that could appear far in the future. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 4) {
          state.memory.authorsNote = "Story Phase: Introduction. Introduce characters, locations, and plot hooks. There should be only minor conflicts. Introduce the possibility of a moderate conflict that could appear far in the future. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 5) {
          state.memory.authorsNote = "Story Phase: Rising Action. Introduce more minor conflicts. Give minor hints as to what a greater conflict in the far future could be. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 6) {
          state.memory.authorsNote = "Story Phase: Rising Action. Introduce the occasional moderate conflict. Give minor hints as to what a greater conflict in the far future could be. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 7) {
          state.memory.authorsNote = "Story Phase: Rising Action. Introduce the occasional moderate conflict. Give minor hints as to what a greater conflict in the far future could be. Introduce conntections to discovered plot hooks. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 8) {
          state.memory.authorsNote = "Story Phase: Rising Action. Introduce the occasional moderate conflict. Give moderate hints as to what a greater conflict in the far future could be. Introduce conntections to discovered plot hooks. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 9) {
          state.memory.authorsNote = "Story Phase: Rising Action. Introduce the occasional moderate conflict. Give moderate hints as to what a greater conflict in the far future could be. Introduce conntections to discovered plot hooks. Begin moving the story towards the greater conflict ahead. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 10) {
          state.memory.authorsNote = "Story Phase: Climax. Introduce the climax of the story. All previous hints about this greater conflict should intersect with this climactic moment. Plot hooks should be connected to this climax. Emphisise major conflict. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 11) {
          state.memory.authorsNote = "Story Phase: Climax. Plot hooks should be connected to this climax. Emphisise major conflict. Push the characters near their limits while staying fair. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 12) {
          state.memory.authorsNote = "Story Phase: Climax. Advance the climax of the story, introduce a challenge to go with it. Emphisise major conflict. Push the characters near their limits while staying fair. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 13) {
          state.memory.authorsNote = "Story Phase: Climax. Advance the climax of the story, introduce challenges to go with it. Emphisise major conflict. Push the characters to their limits. Punish terrible decisions with an appropreate story response. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 14) {
          state.memory.authorsNote = "Story Phase: Climax. Advance the climax of the story. Emphisise major conflict. Push the characters to their limits. Punish bad decisions while not being unfair. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 15) {
          state.memory.authorsNote = "Story Phase: Climax. Advance the climax of the story. Emphisise major conflict. Push the characters to their limits. Punish bad decisions that the characters make. Be unfair at times, but make unfairness in the story make sense with the current plot. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 16) {
          //!WARNING! IT IS NOT RECOMMENDED FOR YOUR STORY TO GET TO THIS STATE. ONLY ENABLE YOUR TRUE MAXIMUM TEMPERATURE TO THIS VALUE IF YOU REALLY REALLY WANT IT TO BE PUNISHING.
          state.memory.authorsNote = "Story Phase: Ultimate Climax. Emphisise increadibly difficult conflict. Push the characters to their limits. Punish bad decisions that the characters make. Be unfair at times. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 17) {
          //!WARNING! IT IS NOT RECOMMENDED FOR YOUR STORY TO GET TO THIS STATE. ONLY ENABLE YOUR TRUE MAXIMUM TEMPERATURE TO THIS VALUE IF YOU REALLY REALLY WANT IT TO BE PUNISHING.
          state.memory.authorsNote = "Story Phase: Ultimate Climax. Emphisise insanely difficult conflict. Push the characters to their absolute limits. Punish bad decisions that the characters make. Make the challenges unfair for characters. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 18) {
          //!WARNING! IT IS NOT RECOMMENDED FOR YOUR STORY TO GET TO THIS STATE. ONLY ENABLE YOUR TRUE MAXIMUM TEMPERATURE TO THIS VALUE IF YOU REALLY REALLY WANT IT TO BE PUNISHING.
          state.memory.authorsNote = "Story Phase: Ultimate Climax. Emphisise insanely difficult conflict. Push the characters to their absolute limits. Heavily punish bad decisions that the characters make. Make the challenges increadibly unfair. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 19) {
          //!WARNING! IT IS NOT RECOMMENDED FOR YOUR STORY TO GET TO THIS STATE. ONLY ENABLE YOUR TRUE MAXIMUM TEMPERATURE TO THIS VALUE IF YOU REALLY REALLY WANT IT TO BE PUNISHING.
          state.memory.authorsNote = "Story Phase: Ultimate Climax. Emphisise impossibly difficult conflict. Push the characters to their absolute limits. Very heavily punish bad decisions that the characters make. Make the challenges increadibly unfair. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 20) {
          //!WARNING! IT IS NOT RECOMMENDED FOR YOUR STORY TO GET TO THIS STATE. ONLY ENABLE YOUR TRUE MAXIMUM TEMPERATURE TO THIS VALUE IF YOU REALLY REALLY WANT IT TO BE PUNISHING.
          state.memory.authorsNote = "Story Phase: Omega Insane Ultimate Climax of Doom. Emphisise insanely difficult conflict. Push the characters to their absolute limits. Very heavily punish bad decisions that the characters make. Make the challenges increadibly unfair. There is no success. " + state.originalAuthorsNote
        }
        if (state.storyTemperature > 20) {
          //!WARNING! IT IS NOT RECOMMENDED FOR YOUR STORY TO GET TO THIS STATE. ONLY ENABLE YOUR TRUE MAXIMUM TEMPERATURE TO THIS VALUE IF YOU REALLY REALLY WANT IT TO BE PUNISHING.
          state.memory.authorsNote = "Story Phase: Apocalypse. Emphisise impossible conflict. There is no success. Make challenges blatently unfair. Punish every decision. Actively attempt to push the characters away from their goal in any way possible. " + state.originalAuthorsNote
        }
      }
      else{
        log("cooldownMode true, deploying alternate prompt")
      //Cooldown Prompts
        if (state.storyTemperature <= 1) {
          state.cooldownMode = false
        }
        if (state.storyTemperature == 2) {
          state.memory.authorsNote = "Story Phase: Downtime. There should be only small bits of tension, with most of the current story being filled with peace and quiet. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 3) {
          state.memory.authorsNote = "Story Phase: Downtime. There should be only minor tension, with most of the current story being filled with peace and quiet. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 4) {
          state.memory.authorsNote = "Story Phase: Downtime. There should be only minor tension, with most of the current story being filled with peaceful encounters. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 5) {
          state.memory.authorsNote = "Story Phase: Downtime. There should be only minor tension, with most of the current story being filled with peaceful encounters, unless characters actively try to cause chaos. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 6) {
          state.memory.authorsNote = "Story Phase: Downtime. There should be only minor tension and conflict, with most of the current story being filled with peaceful encounters, unless characters actively try to cause chaos." + state.originalAuthorsNote
        }
        if (state.storyTemperature == 7) {
          state.memory.authorsNote = "Story Phase: Downtime. There should be only minor tension and conflict, with most of the current story being filled with neutral encounters, unless characters actively try to cause chaos. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 8) {
          state.memory.authorsNote = "Story Phase: Downtime. There should be only minor tension and conflict, with most of the current story containing neutral encounters and minor surprises. This section of story should have a satisfying conclusion for its characters. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 9) {
          state.memory.authorsNote = "Story Phase: Falling Action. The conflicts should be quickly ending, and this section of story should have a satisfying conclusion for its characters. There is still some minor tension and conflict. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 10) {
          state.memory.authorsNote = "Story Phase: Falling Action. The conflicts should be slowly ending, and this section of story should have a satisfying conclusion for its characters. There is still some moderate tension and conflict. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 11) {
          state.memory.authorsNote = "Story Phase: Falling Action. The conflicts should be slowly ending, and this section of story should have a satisfying conclusion for its characters. There is still moderate tension and conflict, but not as much as before. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 12) {
          state.memory.authorsNote = "Story Phase: Falling Action. The conflicts should be slowly ending, and this section of story should have a satisfying conclusion for its characters. There is still moderatly high tension and conflict, but not as much as before. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 13) {
          state.memory.authorsNote = "Story Phase: Falling Action. The conflicts should be slowly ending. There is still moderatly high tension and conflict, but not as much as before. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 14) {
          state.memory.authorsNote = "Story Phase: Falling Action. The conflicts should be beginning to come to a close. There is still moderatly high tension and conflict, but not as much as before. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 15) {
          state.memory.authorsNote = "Story Phase: Falling Action. The conflicts should be beginning to come to a close. Tension and conflict is still high. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 16) {
          state.memory.authorsNote = "Story Phase: Extreme Falling Action. The conflicts should start to show signs of ending. Tension and conflict is still high. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 17) {
          state.memory.authorsNote = "Story Phase: Extreme Falling Action. The conflicts should start to show signs of slightly ending. Tension and conflict is still high. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 18) {
          state.memory.authorsNote = "Story Phase: Extreme Falling Action. The conflicts should start to show signs of slightly ending. Tension and conflict is still very high. " + state.originalAuthorsNote
        }
        if (state.storyTemperature == 19) {
          state.memory.authorsNote = "Story Phase: Extreme Falling Action. Tension and conflict is still very high. " + state.originalAuthorsNote
        }
        if (state.storyTemperature >= 20) {
          state.memory.authorsNote = "Story Phase: Omega Extreme Falling Action. Tension and conflict is still extremely high. " + state.originalAuthorsNote
        }
      }
      state.authorsNoteStorage = state.memory.authorsNote

      return { text }
    }

    const characterQuestions = {
    //  Weapon: 'What is your primary weapon?',
      Race:     'What is your race?',
      Gender:   'What is your gender?',
      Class:    'What is your class?',
      Implant:  'Why are you in the ripperdoc\'s chair? What body part do you want augmented?'
    }

    const characterOptions = {
    //  Weapon: null,
      Race:   ['human', 'android'],
      Gender: [],
      Class:  ['netrunner', 'bouncer', 'police officer', 'fixer', 'first gen', 'corporate thug', 'rich citizen', 'rogue ai', 'nomad', 'cryotech'],
      Implant: []
    }

    const optionsDescriptions = {
      Class: {
        netrunner:        'Steath hacker',
        bouncer:          'Close melee brawler',
        'police officer': 'Law enforcer',
        fixer:            'Black Market dealer',
        'first gen':      'First generation android',
        'corporate thug': 'Hired merc for Corporate affairs',
        'rich citizen':   'High wealth and status low combat ability',
        'rogue ai':       'Newly Self aware AI',
        'nomad':          'Outlands Wanderer',
        'cryotech':       'Cryo Minipulator' 
      }
    }

    const imodifier2 = (text) => {
      if(state.requesting){
        const response = text.slice(You.length, text.length - 2).toLowerCase()
        const options = characterOptions[state.requesting]
        if(arreq(options, []) || options.includes(response)){
          state.character[state.requesting] = response
          state.requesting = null
        }else{
          state.overwrite = true
          state.output = 'Error: Please choose a valid option (as a DO Action): ' + options.join(', ')
          return { text }
        }
      }

      for(const [k, v] of Object.entries(state.character)){
        if(v === null){
          state.overwrite = true
          let descriptions = optionsDescriptions[k]
          if(descriptions){
            state.output = '\n' + characterQuestions[k] + '\n\n' + k + ' Options:\n'
            for(const [option, desc] of Object.entries(descriptions)){
              state.output += option + ': ' + desc + '\n'
            }
          }else{
            state.output = '\n' + characterQuestions[k]
            if(!arreq(characterOptions[k], [])){
              state.output += ' (options: ' + characterOptions[k].join(', ') + '):\n'
            }
          }
          state.requesting = k
          return { text }
        }
      }

      if(once('opening')){
        text += `\n\nLocation: Center District, Ripperdoc office

    Docs Assistant: Alright, checking you in. Name? ${state.character.Name}
    Assistant: Cybernetic classification? ${state.character.Class}
    Assistant: Door on your right—take it all the way down.

    Ripperdoc: ${state.character.Name}, huh? Nice meetin' ya, kid. Have a seat. What can I do for ya?
    "${state.character.Implant}" He hits you with sleep gas. You start drifting.
    — Three hours later —
    Ripperdoc: All done. Take it easy, yeah? Don’t wanna see ya any time soon.
    You pay the Ripperdoc 20k credits and pick up your weapon.`
        return { text }
      }
    }

    const imodifier = (text) => {
      return imodifier2(imodifier1(text).text)
    }

    imodifier(text)
    // Context
    const cmodifier = () => {
      if(Object.values(state.character).some((e) => e === null) && history.slice(-1)[0] && history.slice(-1)[0].type === 'continue'){
        return { stop: true, text: '' }
      }

      text = censor(text, '\n> You /') //Filter out chat commands and their results from AI input
      let ctx = splatContext(text)
      
      if(state.character.Race !== null){
        ctx = inject(ctx, state.character.Race, (ctx, payload) => {
          let insertionpoint = indexLast(ctx.PE, 'Race: ')
          ctx.PE =  ctx.PE.slice(0, insertionpoint) +
                    state.character.Race +
                    ctx.PE.slice(insertionpoint)
        })
      }

      if(state.character.Class !== null){
        ctx = inject(ctx, state.character.Class, (ctx, payload) => {
          let insertionpoint = indexLast(ctx.PE, 'Class: ')
          ctx.PE =  ctx.PE.slice(0, insertionpoint) +
                    state.character.Class +
                    ctx.PE.slice(insertionpoint)
        })
      }

      if(state.character.Gender !== null){
        ctx = inject(ctx, state.character.Gender, (ctx, payload) => {
          let insertionpoint = indexLast(ctx.PE, 'Gender: ')
          ctx.PE =  ctx.PE.slice(0, insertionpoint) +
                    state.character.Gender +
                    ctx.PE.slice(insertionpoint)
        })
      }

      /*ctx = inject(
        ctx,
        '[Player is at ' + state.playerloc + ']\n' +
        '[HP: ' + state.HP + ']\n') // Might need to change "HP:" to "Player starting HP:"
      
      text = unsplatContext(ctx)*/

      return { text }
    }

    cmodifier()
    // Output

    const omodifier2 = (text) => {
      const lowerText = text.toLowerCase()
      const words = lowerText.split(/\s+/)
      let conflictCount = 0
      let calmingCount = 0

      words.forEach(word => {
        const fixedWord = word.replace(/^[^\w]+|[^\w]+$/g, '')
        if (conflictWords.includes(fixedWord)) {
          conflictCount++
        }
        if (calmingWords.includes(fixedWord)) {
          calmingCount++
        }
      })

      if (conflictCount > 0) {
        state.heat += conflictCount * state.modelIncreaseHeatImpact
        if (conflictCount >= state.threshholdModelIncreaseTemperature){
          state.storyTemperature += state.modelIncreaseTemperatureImpact
          log(`Detected ${conflictCount} conflict words (AI). Increasing heat & temperature.`)
        }
        else{
          log(`Detected ${conflictCount} conflict words (AI). Increasing heat.`)
        }
      }
      
      if (calmingCount > 0) {
        state.heat -= calmingCount * state.modelDecreaseHeatImpact
        if (calmingCount >= state.threshholdModelDecreaseTemperature){
          state.storyTemperature -= state.modelDecreaseTemperatureImpact
          log(`Detected ${calmingCount} calming words (AI). Decreasing heat & temperature.`)
        }
        else{
          log(`Detected ${calmingCount} calming words (AI). Decreasing heat.`)
        }
      }

      if (state.storyTemperature > state.trueMaximumTemperature){
        state.storyTemperature = state.trueMaximumTemperature
        log("Temperature over maximum, recalibrating...")
      }

      if (state.storyTemperature <= 0){
        state.storyTemperature = 1
        log("Temperature under minimum, recalibrating...")
      }


      if (state.memory.authorsNote == state.originalAuthorsNote){
        state.memory.authorsNote = state.authorsNoteStorage
      }

      log("Heat: " + state.heat)
      log("Temperature: " + state.storyTemperature)

      return { text }
    }

    function handoff(text, query, idx = 0){
      let jdx
      
      if(((idx = text.indexOf(query, idx)) < 0)
      || ((jdx = text.indexOf('"', idx + 1)) < 0)){ //We assume for now that the AI outputs a Handoff notification within quotes as a part of speech, which is why we look for an ending quote here.
        return [null, -1]
      }
      
      return [text.slice(idx + query.length, jdx), jdx + 1]
    }

    function handoffsOf(text, query, handler){
      let [target, idx] = handoff(text, query)
      while (0 < idx){
        handler(target)
        ;([target, idx] = handoff(text, query, idx)); // Be extremely careful with lines like these since if the semicolons are removed, it won't parse remotely like it's supposed to.
      }
    }

    const omodifier1 = (text) => {
      /*// For when the Handoff sends item obtained notifications
      handoffsOf(text, 'Obtained: ', (item) =>{
        state.inventory.push({
            item,
            birth: history.length
        })
      })
      
      // For when the Handoff sends HP update notifications
      handoffsOf(text, 'HP: ', (HP) => {
        state.HP = parseInt(HP.replaceAll(/[^[0-9]]/g,''))
      })*/

      return { text }
    }

    const omodifier = (text) => {
      return omodifier2(omodifier1(text).text)
    }

    omodifier(text)

    // End
  }).toString())
}