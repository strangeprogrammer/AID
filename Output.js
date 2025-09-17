const modifier = () => {
  if (state.overwrite) {
    state.overwrite = false
    if (typeof state.output == 'string') {
      return { text: state.output || empty }
    } else if (state.output == undefined) {
      return { text: 'undefined' }
    } else {
      return { text: JSON.stringify(state.output) }
    }
  }//else if state.overwrite == false

  return modulesDo('Output')
}

modifier()