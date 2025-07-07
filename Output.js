//DO NOT CHANGE ANYTHING HERE (Exept the conflict & calming word strings if you want to make them better)

const conflictWords = ["attack", "stab", "destroy", "break", "steal", "ruin", "burn", "smash", "sabotage", "disrupt", "vandalize", "overthrow", "assassinate", "plunder", "rob", "ransack", "raid", "hijack", "detonate", "explode", "ignite", "collapse", "demolish", "shatter", "strike", "slap", "obliterate", "annihilate", "corrupt", "infect", "poison", "curse", "hex", "summon", "conjure", "mutate", "provoke", "riot", "revolt", "mutiny", "rebel", "resist", "intimidate", "blackmail", "manipulate", "brainwash", "lie", "cheat", "swindle", "disarm", "fire", "hack", "overload", "flood", "drown", "rot", "dissolve", "slaughter", "terminate", "execute", "drama", "conflict", "evil", "kill", "slay", "defeat", "fight", "doom", "slice", "pain", "dying", "die", "perish", "blood"]

const calmingWords = ["calm", "rest", "relax", "meditate", "sleep", "comfort", "hug", "smile", "forgive", "mend", "repair", "plant", "sing", "dance", "celebrate", "collaborate", "share", "give", "donate", "protect", "shelter", "trust", "hope", "dream", "revive", "eat", "drink", "balance", "cheer", "laugh", "play", "build", "bake", "craft", "cook", "empathize", "apologize", "befriend", "admire", "sympathize", "thank", "appreciate", "cherish", "love", "pet", "respect", "restore", "guide", "teach", "learn", "daydream", "wander", "explore", "discover", "reflect", "happy", "joy", "kind"]

const modifier2 = (text) => {
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

// Combat Script
cleaninventory()

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

const modifier1 = () => {
  if(state.overwrite){
    state.overwrite = false
    if(typeof state.output == 'string'){
      return { text: state.output }
    }else if(state.output == undefined){
      return { text: 'undefined' }
    }else{
      return { text: JSON.stringify(state.output) }
    }
  }//else if state.overwrite == false

  // For when the Handoff sends item obtained notifications
  handoffsOf(text, 'Obtained: ', (item) =>{
    state.inventory.push({
        item,
        birth: history.length
    })
  })
  
  /*// For when the Handoff sends HP update notifications
  handoffsOf(text, 'HP: ', (HP) => {
    state.HP = parseInt(HP.replaceAll(/[^[0-9]]/g,''))
  })*/

  return modulesDo('Output')
}

const modifier = (text) => {
  return modifier2(modifier1(text).text)
}

modifier(text)
