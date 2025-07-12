const modifier = () => {
  //Filter out chat commands and their results from AI input
  text = censor(text, Do + '/')
  text = censor(text, Say + '/')
  text = censor(text, Response)
  
  return modulesDo('Context')
}

modifier()