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
  // This function isn't perfect since it doesn't handle sections being out-of-order well
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
          if(hooktype == 'Preload'){
            eval?.(mod.Library.trim() + ';' + hook.trim(), `In module ${mod.Module}'s ${hooktype} hook`)
          }else{
            ;({ text, stop = stop } = eval?.(mod.Library.trim() + ';' + hook.trim(), `In module ${mod.Module}'s ${hooktype} hook`));
          }
        }
      }
    }
  }

  return { text, stop }
}

const modTokenSaver = (text) => {
    state.overwrite = true
    state.output = empty
    return { text }
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
    Preload,
    Library,
    Input,
    Context,
    Output,
    garbage
  ] = extractSections(s, [
    '// Module: ',
    '// Initially: ',
    '// Preload',
    '// Library',
    '// Input',
    '// Context',
    '// Output',
    '// End'
  ]).map((section) => section.trim());
  let newMod = { Module, Enabled: Enabled.trim() === 'true', Preload, Library, Input, Context, Output }
  state.modules.push(newMod)
  return newMod
}

// Chat Commands

var commands = {
  'help': {
    desc: 'Display (basic) descriptions of all chat commands.',
    fn: (garbage) => {
    state.overwrite = true
    state.output = Object.entries(commands).map(([name, cmd]) =>
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
      return Response + name + ': ' + (state.modules[sought].Enabled ? 'Enabled' : 'Disabled') + '\n'
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
  }}, 'reloadmods': {
    desc: 'Reload all built-in modules.',
    fn: (garbage) => {
    state.modules.length = 0
    state['InlineModules_ONCE'] = true
    state.overwrite = true
    state.output = empty
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
  var retval = (state[key] === undefined) || state[key]
  state[key] = false
  return retval
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
  // YOUR MODULES AUTOMATICALLY IMPORTED HERE
}