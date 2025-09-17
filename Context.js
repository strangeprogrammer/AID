const modifier = () => {
  // Can't just censor the entire context since that'd end up removing the Author's Note accidentally
  let context = splatContext(text)

  //Filter out chat commands and their results from AI input (Recent Story)
  for (let subject in state.subjects) {
    context.RS = censor(context.RS, '\n> ' + subject + ' /')      // Censor 'Do' actions
    context.RS = censor(context.RS, '\n> ' + subject + ' say "/') // Censor 'Say' actions (2nd person)
    context.RS = censor(context.RS, '\n> ' + subject + ' says "/')// Censor 'Say' actions (3rd person)
  }
  context.RS = censor(context.RS, Response) // Censor modified input used as a command's output

  //Filter out chat commands and their results from AI input (Last Action)
  for (let subject in state.subjects) {
    context.LA = censor(context.LA, '\n> ' + subject + ' /')      // Censor 'Do' actions
    context.LA = censor(context.LA, '\n> ' + subject + ' say "/') // Censor 'Say' actions (2nd person)
    context.LA = censor(context.LA, '\n> ' + subject + ' says "/')// Censor 'Say' actions (3rd person)
  }
  context.LA = censor(context.LA, Response) // Censor modified input used as a command's output

  text = unsplatContext(context)

  return modulesDo('Context')
}

modifier()