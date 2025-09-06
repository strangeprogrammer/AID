# AI Dungeon (programming Aid)
Just a few things that can make scenario coding more flexible, and can allow you to run and manage JavaScript code from within individual adventures.

# Features:
* Support for **modules**
	* You can (easily?) import someone else's `Library.js`, `Input.js`, `Context.js`, and `Output.js` as a **module** to use in your own scenario, or even adventure
	* Tired of not being able to use more than one person's scripts at a time? *This* is **the** workaround. <small>(hopefully they don't make each other explode tho lmao)<small>
* Basic support for chat commands (singleplayer only for now - will be updated soon)
	* Submit a `do` or a `say` action with the command `/help` to list all available commands and see a brief description of each
	* Run `/js <YOUR CODE HERE>` to see immediate code execution
	* Chat commands to manage modules
	* Chat commands are automatically removed from the context and are hidden from the AI
	* You can make **your own chat commands**! <small>(tho it's a little janky rn)<small>
* Edit the context easier using the `splatContext`, `inject`, and `unsplatContext` functions
