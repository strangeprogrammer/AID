const modifier = () => {
  modulesDo('Preload')
  state.overwrite = false
  state.output = undefined
  for(command of Object.keys(commands)){
    let prefixA = Do + '/' + command
    let prefixB = Say + '/' + command
    if(text.startsWith(prefixA)){
      You = Do
      let args = text.slice(prefixA.length, text.length - 2).trim()
      return commands[command].fn(args) || { text }
    }else if(text.startsWith(prefixB)){
      You = Say
      let args = text.slice(prefixB.length, text.length - 2).trim()
      return commands[command].fn(args) || { text }
    }
  }

  // If no commands were found
  return modulesDo('Input'))
}

modifier()
