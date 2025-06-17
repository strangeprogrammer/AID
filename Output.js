cleaninventory()

const obtstr = 'Obtained: '

function handoff(text, query, idx = 0){
  idx = text.indexOf(query, idx)
  if(idx < 0){
    return [null, -1]
  }

  let jdx = text.indexOf('"', idx + 1) //We assume that the AI outputs a Handoff notification within quotes as a part of speech for now
  if(jdx < 0){
      return [null, -1]
  }
  
  let item = text.slice(idx + query.length, jdx)
  return [item, jdx + 1]
}

const modifier = () => {
  if(state.overwrite){
    state.overwrite = false
    if(typeof state.output == 'string'){
      return { text: state.output }
    }else if(state.output == undefined){
      return { text: 'undefined' }
    }else{
      return { text: JSON.stringify(state.output) }
    }
  }//else state.overwrite == false

  // For when the Handoff sends "Obtained:" notifications
  let [item, idx] = handoff(text, obtstr)
  while (0 < idx){
    state.inventory.push({
        item,
        birth: history.length
    });
    ([item, idx] = handoff(text, obtstr, idx));
  }

  return { text }
}

modifier()