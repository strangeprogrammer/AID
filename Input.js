let commands = {
  'js ': (args) => {
    state.overwrite = true
    state.output = eval?.(args)
  }, 'set ': (args) => {
    state.overwrite = true
    state.output = empty
    let space = args.indexOf(' ')
    let k = args.slice(0, space)
    let v = args.slice(space + 1)
    state.boot.push('globalThis.' + k + ' = ' + v)
  }, 'lsmod': (garbage) => {
    let result = ''
    let mods = state.modules
    for(let i = 0; i < mods.length; i++){
      result += String(i) + ' ' + mods[i].Module + '\n'
    }
    result = result.trimEnd()
    state.overwrite = true
    state.output = result
  }, 'addmod ': (args) => {
    let [
      Module,
      Library,
      Input,
      Context,
      Output
    ] = extractSections(args, [
      '// Module: ',
      '// Library',
      '// Input',
      '// Context',
      '// Output'
    ]);
    Module = Module.trim()
    state.modules.push({ Module, Library, Input, Context, Output })
    state.overwrite = true
    state.output = empty
    return { text: You + '/addmod \'' + Module + '\' successfully.' }
  }, 'rmmod': (args) => {
    state.modules.splice(state.modules.findIndex((mod) => mod.Module === args), 1)
    state.overwrite = true
    state.output = empty
    return { text: You + '/rmmod \'' + Module + '\' successfully.' }
  }
}

Object.assign(commands, {
  'buy ': (item) => {
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
  }, 'loc ': (destination) => {
    let source = map[state.playerloc]
    if(source.includes(destination)){// If can be reached by the player
      state.playerloc = destination
    }else{
      state.message = 'Error: ' + destination + ' can\'t be reached from ' + state.playerloc
      state.overwrite = true
      state.output = empty
      return { text: empty }
    }
  }
})

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
  Gender: ['male', 'female', 'other'],
  Class:  ['netrunner', 'bouncer', 'police officer', 'fixer', 'first gen', 'corporate thug', 'rich citizen', 'rogue ai'],
  Implant: []
}

const optionsDescriptions = {
  netrunner:        'Steath hacker',
  bouncer:          'Close melee brawler',
  'police officer': 'Law enforcer',
  fixer:            'Black Market dealer',
  'first gen':      'First generation android',
  'corporate thug': 'DESCRIPTION TO BE ADDED LATER',
  'rich citizen':   'High wealth and status low combat ability',
  'rogue ai':       'Newly Self aware AI'
}

const modifier = () => {
  if(state.character.Name === null){
    const PEM = state.memory.context // PEM = Plot Essentials and Memory
    const field = 'Name: '
    const start = PEM.indexOf(field) + field.length
    const terminator = '\n'
    const end = PEM.indexOf(terminator, start)
    state.character.Name = PEM.slice(start, end)
  }

  if(state.requesting){
    const response = text.slice(You.length, text.length - 2).toLowerCase()
    const options = characterOptions[state.requesting]
    if(arreq(options, []) || options.includes(response)){
      state.character[state.requesting] = response
      state.requesting = null
    }else{
      state.overwrite = true
      state.output = 'Error: Please choose a valid option: ' + options.join(', ')
      return { text }
    }
  }

  for(const [k, v] of Object.entries(state.character)){
    if(v === null){
      state.overwrite = true
      state.output = '\n\nInput your ' + k.toLowerCase() + ' here (options: ' + characterOptions[k].join(', ') + '): '
      state.requesting = k
      return { text }
    }
  }

  if(once('opening')){
    state.overwrite = true
    state.output = `Location: Center District, Ripperdoc office

Docs Assistant: Alright, checking you in. Name? ${state.character.Name}
Assistant: Cybernetic classification? ${state.character.Class}
Assistant: Door on your right—take it all the way down.

Ripperdoc: ${state.character.Name}, huh? Nice meetin' ya, kid. Have a seat. What can I do for ya?
"${state.character.Implant}"
He hits you with sleep gas. You start drifting.

— Three hours later —

Ripperdoc: All done. Take it easy, yeah? Don’t wanna see ya any time soon.

${state.character.Name} pays doc 20k credits and picks up weapon.`
    return { text }
  }

  state.overwrite = false
  state.output = undefined
  for(command of Object.keys(commands)){
    let prefix = You + '/' + command
    if(text.startsWith(prefix)){
      let args = text.slice(prefix.length, text.length - 2)
      let result = commands[command](args)
      if(result == undefined){
        break
      }else{
        return result
      }
    }
  }
  
  return modulesDo('Input')
}

modifier()
