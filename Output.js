cleaninventory()

function handoff(text, query, idx = 0){
  let jdx
  
  if(((idx = text.indexOf(query, idx)) < 0)
  || ((jdx = text.indexOf('"', idx + 1)) < 0)){ //We assume for now that the AI outputs a Handoff notification within quotes as a part of speech, which is why we look for an ending quote here.
    return [null, -1]
  }
  
  return [text.slice(idx + query.length, jdx), jdx + 1]
}

function handoffsOf(text, query, handler){
  let [target, idx] = handoff(text, query)
  while (0 < idx){
    handler(target)
    ;([target, idx] = handoff(text, query, idx)); // Be extremely careful with lines like these since if the semicolons are removed, it won't parse remotely like it's supposed to.
  }
}

const modifier = () => {
  if(state.overwrite){
    state.overwrite = false
    if(typeof state.output == 'string'){
      return { text: '\'' + state.output + '\'' }
    }else if(state.output == undefined){
      return { text: 'undefined' }
    }else{
      return { text: JSON.stringify(state.output) }
    }
  }//else if state.overwrite == false

  // For when the Handoff sends item obtained notifications
  handoffsOf(text, 'Obtained: ', (item) =>{
    state.inventory.push({
        item,
        birth: history.length
    })
  })

  // For when the Handoff sends HP update notifications
  handoffsOf(text, 'HP: ', (HP) => {
    state.HP = parseInt(HP.replaceAll(/[^[0-9]]/g,''))
  })

  return modulesDo('Output')
}

modifier()
