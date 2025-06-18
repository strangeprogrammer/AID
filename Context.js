const doJS = '\n> You /js '
const doSet = '\n> You /set '

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

const headings = [
  '',
  'World Lore:\n',
  'Story Summary:\n',
  'Memories:\n',
  'Recent Story:\n',
  '[Author\'s note: ',
  ']\n'
]

function splatContext(text){
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
  return  headings[0] + ctx.PE +
          headings[1] + ctx.SC +
          headings[2] + ctx.SS +
          headings[3] + ctx.MM +
          headings[4] + ctx.RS +
          headings[5] + ctx.AN +
          headings[6] + ctx.LA
}

function inject(ctx, payload){
  const prefix = '...' // Might have to delete this sequence eventually (don't know how the AI would react exactly)
  let additions = prefix.length + payload.length
  let overflow = (ctx.length + additions) - info.maxChars
  if(0 < overflow){
    ctx.RS = ctx.RS.slice(ctx.RS.length - overflow)
    ctx.RS = ctx.RS.slice(ctx.RS.search(/[\s]/g))
    ctx.RS = prefix + ctx.RS
  }
  ctx.LA += payload
  return ctx // For convenience
}

const modifier = () => {
  text = censor(censor(text, doJS), doSet)
  text = unsplatContext(inject(
    splatContext(text),
    '[Player is at ' + state.playerloc + ']'))
  return { text }
}

modifier()
