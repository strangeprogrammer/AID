#!`which sh`

exec 1>./Library.js
exec 2>/dev/null

set -e

# Get the main body of the library
sed -ne '/YOUR MODULES AUTOMATICALLY IMPORTED HERE/q;p' ./Library_template.js

# Import all modules
ls ./modules/ | while read MODULE; do
	TARGET='./modules/'${MODULE}
	cat <<EOF
makeMod((() => {
  // Module: ${MODULE}
  // Initially: `cat ${TARGET}/Initially.js || echo -n true`
  // Preload
`cat ${TARGET}/Preload.js`
  // Library
`cat ${TARGET}/Library.js`
  // Input
`cat ${TARGET}/Input.js`
  // Context
`cat ${TARGET}/Context.js`
  // Output
`cat ${TARGET}/Output.js`
  // End
}).toString())

EOF
done

# Output anything after the insertion point
sed -ne ': again; /YOUR MODULES AUTOMATICALLY IMPORTED HERE/b found;d;b again;: found;n;p;b found;' ./Library_template.js
