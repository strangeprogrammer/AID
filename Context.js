const modifier = () => {
  text = censor(text, '\n> You /') //Filter out chat commands and their results from AI input
  let ctx = splatContext(text)
  
  if(state.character.Race !== null){
    ctx = inject(ctx, state.character.Race, (ctx, payload) => {
      let insertionpoint = indexLast(ctx.PE, 'Race: ')
      ctx.PE =  ctx.PE.slice(0, insertionpoint) +
                state.character.Race +
                ctx.PE.slice(insertionpoint)
    })
  }

  if(state.character.Class !== null){
    ctx = inject(ctx, state.character.Class, (ctx, payload) => {
      let insertionpoint = indexLast(ctx.PE, 'Class: ')
      ctx.PE =  ctx.PE.slice(0, insertionpoint) +
                state.character.Class +
                ctx.PE.slice(insertionpoint)
    })
  }

  if(state.character.Gender !== null){
    ctx = inject(ctx, state.character.Gender, (ctx, payload) => {
      let insertionpoint = indexLast(ctx.PE, 'Gender: ')
      ctx.PE =  ctx.PE.slice(0, insertionpoint) +
                state.character.Gender +
                ctx.PE.slice(insertionpoint)
    })
  }

  ctx = inject(
    ctx,
    '[Player is at ' + state.playerloc + ']\n' +
    '[HP: ' + state.HP + ']\n') // Might need to change "HP:" to "Player starting HP:"
  
  text = unsplatContext(ctx)
  
  return modulesDo('Context')
}

modifier()
