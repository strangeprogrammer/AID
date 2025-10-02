const modifier = (text) => {
  return { text: text.replace('You', 'You and your dog') }
}

modifier(text)