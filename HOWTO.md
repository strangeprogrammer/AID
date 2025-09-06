# HOWTO (importing modules)
## Inline Modules

This section is largely for scenario creators who want to either import other people's modules, or create their own module and test it against other people's modules.

 1. Go into the `modules` folder
 2. Create a folder with the name of the module you're importing or making
 3. Inside the folder, download or create the following files (every file is optional):
	* `Initially.js`: Put either `true` or `false` into this file, depending on whether you want this module enabled at startup
		* If this file is absent, defaults to `true`
	* `Preload.js`: Put code that you want to run before chat commands are interpreted into this file
		* Useful for creating your own chat commands, so that they can be interpreted properly
		* Likely to be changed in a future update
	* `Library.js`: Paste your module's `Library.js` code directly into this file
	* `Input.js`: Paste your module's `Input.js` code directly into this file
	* `Context.js`: Paste your module's `Context.js` code directly into this file
	* `Output.js`: Paste your module's `Output.js` code directly into this file
 4. Back in the `modules` folder, edit the `LoadOrder.txt` file
	* Type your module's name onto its own line, below any modules which need to be loaded before it, and above any modules which need to be loaded after it
		* If your module's name isn't present, your module won't be imported at all
		* You can start a new line with the `#` character to put some comments into this file
	* If you delete the `LoadOrder.txt` file, all modules in the `modules` folder will be imported (typically in alphabetical order)
 5. Back in the project's root directory, run either `interpolate.ps1` (for Windows systems) or `interpolate.sh` (for Mac/UNIX and Linux systems). This will generate the root `Library.js` file for the next step
 6. From the project root directory, paste the contents of the `Library.js`, `Input.js`, `Context.js`, and `Output.js` files directly into your scenario.

## Adventure-only Modules

This section is primarily for people who play an adventure derived from someone else's scenario so that they themselves can still enjoy the benefits of modules and chat commands, even if they don't have access to the scenario's original code.

NEEDS DOCUMENTATION (but believe me, it's ugly and needs improvement)

## Story Card Modules

Ditto, but using story cards instead of pasting code into the chatbox.

TO BE IMPLEMENTED IN A FUTURE UPDATE.
