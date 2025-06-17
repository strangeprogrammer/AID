// Wallet  Code

if(state.wallet === undefined){
  state.wallet = 0
}

const commands = [
  {
    cmd: '/buy ',    fn: (text, cmd) => {
    let name = text.slice(cmd.length, text.length - 2)
    state.inventory.push({
      name,
      birth: history.length
    })
  }}, {
    cmd: '/sell ',   fn: (text, cmd) => {
    console.log(text.slice(cmd.length, text.length - 2))
  }}, {
    cmd: '/shop ',   fn: (text, cmd) => {
    state.overwrite = true
    state.output = text.slice(cmd.length, text.length - 2)
    console.log(state.output)
  }}, {
    cmd: '/credits', fn: (text, cmd) => {
    state.overwrite = true
    state.output = state.wallet.toString()
    console.log(state.otuput)
  }}, {
    cmd: '/js ', fn: (text, cmd) => {
    state.overwrite = true
    state.output = eval(text.slice(cmd.length, text.length - 2))
  }}, {
    cmd: '/set ', fn: (text, cmd) => {
    state.overwrite = true
    state.output = empty
    let space = text.indexOf(" ", cmd.length)
    let arg1 = text.slice(cmd.length, space)
    let arg2 = text.slice(space + 1, text.length - 2)
    state.boot.push('globalThis.' + arg1 + ' = ' + arg2)
  }},{
    cmd: '/loc ', fn: (text, cmd) => {
    let destination = text.slice(cmd.length, text.length - 2)
    let source = map[state.playerloc]
    if(source.includes(destination)){// If can be reached by the player
      state.playerloc = destination
    }else{
      state.message = 'Error: ' + destination + ' can\'t be reached from ' + state.playerloc
      state.overwrite = true
      state.output = empty
      return { text: empty }
    }
  }}
]

const modifier = () => {
  state.overwrite = false
  state.output = undefined
  for(let index = 0; index < commands.length; index++){
    let element = commands[index]
    if(text.startsWith(playerDo + element.cmd)){
      let result = element.fn(text, playerDo + element.cmd)
      if(result == undefined){
        return { text }
      }else{
        return result
      }
    }
  }
  
  return { text }
}

modifier()