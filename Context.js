const doJS = "\n> You /js "
const doSet = "\n> You /set "

function censor(text, actionstr){
  //Filter out JavaScript commands from AI input
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

const modifier = () => {
  text = censor(censor(text, doJS), doSet)
  text = text + '[Player is at ' + state.playerloc + ']'
  return { text }
}

modifier()