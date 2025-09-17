const modifier = () => {
  modulesDo('Preload')
  state.overwrite = false
  state.output = undefined

  let payload
  if (text.startsWith('\n> ')) {
    state.subject = text.split(' ').filter(x => x)[1] // Don't use whitespace in your player name or it'll throw a wrench into this
    state.subjects[state.subject] = true // Register another subject for censoring purposes

    // Quotation trimming for 'say' actions (second and third person)
    // This is a little janky since it assumes that the 'say "' or 'says "' text comes directly after the subject in the sentance, when it could actually come much later (but we don't talk about that)

    const saystart = indexLast(text, state.subject)
    let prefixend = saystart

    let newstart = indexLast(text, 'say "', saystart)
    if (-1 < newstart) {
      prefixend = newstart
    }
    newstart = indexLast(text, 'says "', saystart)
    if (-1 < newstart) {
      prefixend = newstart
    }

    payload = text.slice(prefixend, text.length - 2).trim() // Interestingly, the same amount is trimmed from the end of both 'Do' and 'Say' actions
  } else { // Check the game's opening prompt for a command, too
    payload = text
  }

  for (command of Object.keys(commands)) {
    let cmd = '/' + command
    if (payload.startsWith(cmd)) {
      let args = payload.slice(cmd.length, payload.length)
      return commands[command].fn(args) || { text }
    }
  } // Else if no commands were found

  ; ({ text, stop } = modulesDo('Input'));

  return { text, stop }
}

modifier()